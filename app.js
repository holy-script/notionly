"use strict";
const Discord = require("discord.js");
const child = require("child_process");
require("dotenv").config();
const Firestore = require("@google-cloud/firestore");

const db = new Firestore({
    projectId: process.env.PROJECT_ID,
    keyFilename: process.env.KEY_FILE_PATH,
});
const projectRef = db.collection("projects");

const client = new Discord.Client();

const runScript = async(params) => {
    const spawnSync = child.spawnSync;
    const python = spawnSync(
        "python", [
            "./script.py",
            ...params,
            currentProject.pageLink,
            currentProject.token_v2,
            currentProject.name,
        ], {
            encoding: "utf8",
        }
    );
    return python.stdout.slice(0, -1);
};

const currentProject = {
    name: "",
    token_v2: "",
    pageLink: "",
    admin: "",
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
        menu: async(params) => {
            const user = params.pop();
            return `Hello ${user}, this is the menu!`;
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
            return "Page Locked!";
        },
        history: async(params) => {
            return "Science, yo! No, wait...";
        },
    },
    crud: {
        add: async(params) => {
            return "Add used";
        },
        read: async(params) => {
            params.push("read");
            return await runScript(params);
        },
        update: async() => {
            return "Update used";
        },
        delete: async(params) => {
            params.push("delete");
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
};

client.on("ready", async() => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("message", async(msg) => {
    if (!msg.author.bot) {
        if (msg.attachments.size > 0) {
            msg.attachments.forEach((attachment) => {
                quickstart(attachment.url);
            });
        }
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
            command === "status" ?
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