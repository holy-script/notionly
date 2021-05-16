"use strict";
const Discord = require("discord.js");
const client = new Discord.Client();
const child = require("child_process");
require("dotenv").config();
const Firestore = require("@google-cloud/firestore");
const vision = require("@google-cloud/vision");

const db = new Firestore({
    projectId: process.env.PROJECT_ID,
    keyFilename: process.env.KEY_FILE_PATH,
});
const projectRef = db.collection("projects");

const currentProject = {
    name: "",
    token_v2: "",
    pageLink: "",
    admin: "",
};

const visionOCR = async(url) => {
    const projectId = process.env.PROJECT_ID;
    const keyFilename = process.env.KEY_FILE_PATH;
    const client = new vision.ImageAnnotatorClient({ projectId, keyFilename });
    const [result] = await client.documentTextDetection(url);
    const fullTextAnnotation = result.fullTextAnnotation;
    return fullTextAnnotation ? fullTextAnnotation.text : -1;
};

const runScript = async(params) => {
    const spawnSync = child.spawnSync;
    const python = spawnSync(
        "python", [
            __dirname + "/script.py",
            ...params,
            currentProject.pageLink,
            currentProject.token_v2,
            currentProject.name,
        ], {
            encoding: "utf8",
        }
    );
    return python.stdout.slice(0, -1) || python.stderr;
};

const commandPallette = {
    init: {
        setup: async(params) => {
            userId = params.pop();
            projectName = params.join(" ");
            await projectRef.doc(projectName).set({
                token_v2: "",
                pageLink: "",
                admin: userId,
            });
            currentProject.name = projectName;
            currentProject.admin = userId;
            return "Project successfully setup!";
        },
        load: async(params) => {
            const user = params.pop();
            const old = currentProject.admin;
            let toSet = await projectRef.doc(params.join(" ")).get();
            if (toSet.exists) {
                currentProject.name = params.join(" ");
                toSet = toSet.data();
                Object.keys(toSet).forEach((key) => (currentProject[key] = toSet[key]));
                return `Project successfully loaded ${user}, please check status.\nAdministrator changed from ${
          old || "None"
        } to ${currentProject.admin}!`;
            } else return "Project not found!";
        },
    },
    admin: {
        token: async(params) => {
            const tk2 = params.join("");
            currentProject.token_v2 = tk2;
            await projectRef.doc(currentProject.name).update({
                token_v2: tk2,
            });
            return `The current token value is set to: \n\`${tk2}\``;
        },
        page: async(params) => {
            const pl = params.join("");
            currentProject.pageLink = pl;
            await projectRef.doc(currentProject.name).update({
                pageLink: pl,
            });
            return `The current page link is set to:\n\`${pl}\``;
        },
        lock: async(params) => {
            params.push("lock");
            await runScript(params);
            return "Page Locked!";
        },
        unlock: async(params) => {
            params.push("unlock");
            await runScript(params);
            return "Page Unlocked!";
        },
    },
    crud: {
        add: async(params) => {
            params.push("create");
            return await runScript(params);
        },
        read: async(params) => {
            params.push("read");
            return await runScript(params);
        },
        update: async(params) => {
            params.push("update");
            return await runScript(params);
        },
        delete: async(params) => {
            params.push("delete");
            return await runScript(params);
        },
        img: async(params) => {
            params.push("img");
            return await runScript(params);
        },
        video: async(params) => {
            params.push("video");
            return await runScript(params);
        },
    },
    status: async() => {
        return currentProject.name ?
            `\`\`\`Project: ${currentProject.name}\n\nToken: ${
          currentProject.token_v2 ? "Set" : "Not Set"
        }\n\nPage: ${currentProject.pageLink || "Not Set"}\n\nAdmin: ${
          currentProject.admin
        }\`\`\`` :
            "Please setup the project first!";
    },
    menu: async() => {
        return `\`\`\`Hello, this is the menu! Valid commands include:\n1.!status - Used to check status of the current project\n2. !menu - To view command list\n3. !setup *Project Name* - To start up a project and store it on Firebase\n4. !load *Project Name* - To load a project from Firebase if it exists\n5. !token *token_v2* - To set the token value from the user's Notion cookie\n6. !page *page link* - To set the link of publicly shared and untitled page in the project\n7. !lock *label* - To lock the page from any edits\n8. !unlock *label* - To unlock the page\n9. !add *label* *img attachment* - To add a specified block to the project.\n10. !read *query string* - To get the hyperlink of the indexed block of the page.\n11. !update *query string* *img attachment* - To set text of queried block to image's text\n12. !delete *query string* - To delete the indexed block of the page.\n13. !img *url* - To add the specified image to the project\n14. !video *url* - To add the specified video to the project\n\`\`\``;
    },
};

client.on("ready", async() => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("message", async(msg) => {
    if (!msg.author.bot) {
        let command = msg.content.trim();
        let params = command.split(/\s+/);
        command = command.match(/\![a-zA-Z]+/);
        command !== null ?
            (command = command[0].slice(1)) :
            msg.channel.send("Did not find any command, please try again");
        params.length > 1 ?
            params.splice(params.indexOf(`!${command}`), 1) :
            (params = null);
        if (!params) {
            command === "status" || command === "menu" ?
                msg.channel.send(await commandPallette[command]()) :
                msg.reply("Please add proper command parameters!");
        } else {
            if (commandPallette.init.hasOwnProperty(command)) {
                msg.channel.send(
                    await commandPallette.init[command]([...params, msg.author.username])
                );
            } else if (commandPallette.admin.hasOwnProperty(command)) {
                currentProject.admin === msg.author.username ?
                    msg.channel.send(await commandPallette.admin[command](params)) :
                    msg.reply("You are not authorized, please request project admin.");
            } else if (commandPallette.crud.hasOwnProperty(command)) {
                let textToParse = [];
                const urls = msg.attachments.map((att) => att.url);
                for (const url of urls) {
                    let output = await visionOCR(url);
                    if (output === -1) {
                        msg.reply(
                            "Unable to recognize any characters, please use a different input!"
                        );
                        break;
                    }
                    output.split("\n").forEach((line) => {
                        textToParse.push(line.trim());
                    });
                }
                if (textToParse) {
                    params = [params.join(" "), ...textToParse];
                }
                currentProject.token_v2 && currentProject.pageLink ?
                    msg.channel.send(await commandPallette.crud[command](params)) :
                    msg.reply(
                        "Please set the token and page link before performing this operation."
                    );
            } else {
                msg.reply("Invalid command, please type `!menu`");
            }
        }
    }
});

client.login(process.env.TOKEN);