import { styleText } from 'node:util';
import figures from '@inquirer/figures';
import { getDefaultKeybindings } from "./key.js";
export const defaultTheme = {
    prefix: {
        idle: styleText('blue', '?'),
        done: styleText('green', figures.tick),
    },
    spinner: {
        interval: 80,
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((frame) => styleText('yellow', frame)),
    },
    keybindings: [],
    style: {
        answer: (text) => styleText('cyan', text),
        message: (text) => styleText('bold', text),
        error: (text) => styleText('red', `> ${text}`),
        defaultAnswer: (text) => styleText('dim', `(${text})`),
        help: (text) => styleText('dim', text),
        highlight: (text) => styleText('cyan', text),
        key: (text) => styleText('cyan', styleText('bold', `<${text}>`)),
    },
};
export function getDefaultTheme() {
    return {
        ...defaultTheme,
        keybindings: getDefaultKeybindings(),
    };
}
