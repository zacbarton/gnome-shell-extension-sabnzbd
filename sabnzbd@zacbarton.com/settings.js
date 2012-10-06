const Gio = imports.gi.Gio;
const GioSSS = Gio.SettingsSchemaSource;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const URL = "url";
const APIKEY = "apikey";
// const USERNAME = "username";
// const PASSWORD = "password";

const SHOWSPEED = "show-speed";
// const REFRESHINTERVAL = "refresh-interval";

function getSettings() {
	let schema = Extension.metadata["settings-schema"];
	let schemaDir = Extension.dir.get_child("schemas");

	let schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
	let schemaObj = schemaSource.lookup(schema, true);

	if (!schemaObj) {
		throw new Error("Schema " + schema + " could not be found for extension " + Extension.metadata.uuid + ". Please check your installation.");
	}

	return new Gio.Settings({settings_schema: schemaObj});
}