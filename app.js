"use strict";
const Discord = require("discord.js");
require("dotenv").config();

const client = new Discord.Client();

const commandPallette = {
    init: async() => {
        return "Project initialized.";
    },
    admin: async() => {
        return "Administrator command used";
    },
    crud: async() => {
        return "CRUD operation performed";
    },
};

client.on("ready", async() => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("message", async(msg) => {
    if (msg.content === "ping") {
        msg.reply("pong");
    }
});

client.login(process.env.TOKEN);