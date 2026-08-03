"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(path.join(root, "ui.html"), "utf8");
const avatar = fs.readFileSync(path.join(root, "avatar.jpg")).toString("base64");
const output = template.replace('src="avatar.jpg"', `src="data:image/jpeg;base64,${avatar}"`);

fs.writeFileSync(path.join(root, "ui.generated.html"), output, "utf8");
