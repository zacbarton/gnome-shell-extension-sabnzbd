const Lang = imports.lang;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Extension.imports.settings;

function init() {
	
}

function buildPrefsWidget() {
	let settings = Settings.getSettings();

	let scroll = new Gtk.ScrolledWindow();

	let frame = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL,
		border_width: 10
		, expand: true
	});
	frame.set_spacing(6);

	let sabnzbdLabel = new Gtk.Label({label: "<b>SABnzbd Settings</b>", use_markup: true, xalign: 0});
	let sabnzbdBox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
	
		let urlBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 5});
			let urlLabel = new Gtk.Label({label: "URL", margin_right: 66, xalign: 0}); // margin_right = hack
			let urlEntry = new Gtk.Entry({text: settings.get_string(Settings.URL), xalign: 0, widthChars: 40});
			urlEntry.set_placeholder_text("SABnzbd URL (eg. http://localhost:8000)");
			urlEntry.connect("changed", Lang.bind(this, function(entry) {
				settings.set_string(Settings.URL, entry.text.replace(/\/$/, ""));
			}));
		
		/*
		let usernameBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 5});
			let usernameLabel = new Gtk.Label({label: "Username", margin_right: 30, xalign: 0}); // margin_right = hack
			let usernameEntry = new Gtk.Entry({text: settings.get_string(Settings.USERNAME), xalign: 0});
			usernameEntry.set_placeholder_text("");
			usernameEntry.connect("changed", Lang.bind(this, function(entry) {
				settings.set_string(Settings.USERNAME, entry.text);
			}));
		
		let passwordBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 5});
			let passwordLabel = new Gtk.Label({label: "Password", margin_right: 32, xalign: 0}); // margin_right = hack
			let passwordEntry = new Gtk.Entry({text: settings.get_string(Settings.PASSWORD), xalign: 0, visibility: false});
			passwordEntry.set_placeholder_text("");
			passwordEntry.connect("changed", Lang.bind(this, function(entry) {
				settings.set_string(Settings.PASSWORD, entry.text);
			}));
		*/
		
		let apiKeyBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 5});
			let apiKeyLabel = new Gtk.Label({label: "API Key", margin_right: 44, xalign: 0}); // margin_right = hack
			let apiKeyEntry = new Gtk.Entry({text: settings.get_string(Settings.APIKEY), xalign: 0, widthChars: 40});
			apiKeyEntry.set_placeholder_text("SABnzbd Config -> General -> API Key");
			apiKeyEntry.connect("changed", Lang.bind(this, function(entry) {
				settings.set_string(Settings.APIKEY, entry.text);
			}));
	
	let extensionLabel = new Gtk.Label({label: "<b>Extension Settings</b>", use_markup: true, margin_top: 20, xalign: 0});
	let extensionBox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
		
		let speedBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 5});
			let speedLabel = new Gtk.Label({label: "Show Speed", margin_right: 14, xalign: 0}); // margin_right = hack
			let speedSwitch = new Gtk.Switch({active: settings.get_boolean(Settings.SHOWSPEED)});
			speedSwitch.connect("button-press-event", Lang.bind(this, function(check) {
				settings.set_boolean(Settings.SHOWSPEED, !check.get_active());
			}));
			
		/*
		let refreshBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 5});
			let refreshLabel = new Gtk.Label({label: "Refresh Interval", margin_right: 46, xalign: 0}); // margin_right = hack
			let refreshInterval = new Gtk.SpinButton();
			refreshInterval.set_range(1, 1800); // 1s to 30mins
			refreshInterval.set_value(settings.get_double(Settings.REFRESHINTERVAL));
			refreshInterval.set_increments(1, 5); // 5 = page up/down increment
			refreshInterval.connect("value-changed", Lang.bind(this, function(button) {
				settings.set_double(Settings.REFRESHINTERVAL, button.get_value_as_int());
			}));
			*/
	
	frame.add(sabnzbdLabel);
	frame.add(sabnzbdBox);
	
		sabnzbdBox.add(urlBox);
			urlBox.add(urlLabel);
			urlBox.add(urlEntry);
			
		/*
		sabnzbdBox.add(usernameBox);
			usernameBox.add(usernameLabel);
			usernameBox.add(usernameEntry);
		sabnzbdBox.add(passwordBox);
			passwordBox.add(passwordLabel);
			passwordBox.add(passwordEntry);
		*/
		
		sabnzbdBox.add(apiKeyBox);
			apiKeyBox.add(apiKeyLabel);
			apiKeyBox.add(apiKeyEntry);
	
	frame.add(extensionLabel);
	frame.add(extensionBox);
		
		extensionBox.add(speedBox);
			speedBox.add(speedLabel);
			speedBox.add(speedSwitch);
			
		/*
		extensionBox.add(refreshBox);
			refreshBox.add(refreshLabel);
			refreshBox.add(refreshInterval);
		*/
	
	frame.show_all();
	scroll.show_all();
	scroll.add_with_viewport(frame);
	
	return scroll;
}