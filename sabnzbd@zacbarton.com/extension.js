const Extension = imports.misc.extensionUtils.getCurrentExtension();
const SABnzbd = Extension.imports.sabnzbd;
const Main = imports.ui.main;

let sabnzbd;

function init() {
	sabnzbd = new SABnzbd.SABnzbd();
	Main.sabnzbd = sabnzbd;
}

function enable() {
	sabnzbd.enable();
}

function disable() {
	sabnzbd.disable();
}