const keybindings = ['emacs', 'vim'];
const keybindingLookup = new Set(keybindings);
function isKeybinding(value) {
    return keybindingLookup.has(value);
}
export function getDefaultKeybindings() {
    const env = process.env['INQUIRER_KEYBINDINGS'];
    if (!env)
        return [];
    return Array.from(new Set(env
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(isKeybinding)));
}
export const isUpKey = (key, keybindings = []) => 
// The up key
key.name === 'up' ||
    // Vim keybinding: hjkl keys map to left/down/up/right
    (keybindings.includes('vim') && key.name === 'k') ||
    // Emacs keybinding: Ctrl+P means "previous" in Emacs navigation conventions
    (keybindings.includes('emacs') && key.ctrl && key.name === 'p');
export const isDownKey = (key, keybindings = []) => 
// The down key
key.name === 'down' ||
    // Vim keybinding: hjkl keys map to left/down/up/right
    (keybindings.includes('vim') && key.name === 'j') ||
    // Emacs keybinding: Ctrl+N means "next" in Emacs navigation conventions
    (keybindings.includes('emacs') && key.ctrl && key.name === 'n');
export const isSpaceKey = (key) => key.name === 'space';
export const isBackspaceKey = (key) => key.name === 'backspace';
export const isTabKey = (key) => key.name === 'tab';
export const isNumberKey = (key) => '1234567890'.includes(key.name);
export const isEnterKey = (key) => key.name === 'enter' || key.name === 'return';
export const isShiftKey = (key) => key.shift;
