const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Panel = imports.ui.panel;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const GLib = imports.gi.GLib;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Extension.imports.settings;

const SABnzbd = new Lang.Class({
	Name: "SABnzbd",
	Extends: PanelMenu.Button,

	_init: function() {
		this.settings = Settings.getSettings();
		
		this.parent(0.0, "SABnzbd");
		this.setupTransport();
		this.buildIndicator();
		this.buildMenu();
		this.watchSettings();
	},
	
	enable: function() {
		this.updateDelay = 1000;
		this.update();
		
		// ensure we are always on the far left
		let enableTimeout = Mainloop.timeout_add(500, Lang.bind(this, function() {
			if (Main.panel.statusArea["SABnzbd"]) {
				Main.panel._rightBox.insert_child_at_index(this.container, 0);
			} else {
				Main.panel.addToStatusArea("SABnzbd", this, 0);	
			}
			
			Mainloop.source_remove(enableTimeout);
		}));
	},
	
	disable: function() {
		if (this.queueTimeout) {
			Mainloop.source_remove(this.queueTimeout);
		}
		
		if (this.historyTimeout) {
			Mainloop.source_remove(this.historyTimeout);
		}
		
		Main.panel._rightBox.remove_actor(this.container);
		delete Main.panel.statusArea["SABnzbd"];
	},
	
	setupTransport: function() {
		this.transport = new Soup.SessionAsync({timeout: 10});
		
		// http://blog.mecheye.net/2012/02/requirements-and-tips-for-getting-your-gnome-shell-extension-approved/
		Soup.Session.prototype.add_feature.call(this.transport, new Soup.ProxyResolverDefault());
	},
	
	buildIndicator: function() {
		this.indicatorIconEffect = new Clutter.DesaturateEffect({factor: 1});
		this.indicatorIconFile = Gio.file_new_for_path(Extension.dir.get_path() + "/icons/default.png");
		
		this.indicatorBox = new St.BoxLayout({style_class: "indicator-container"});
		this.actor.add_actor(this.indicatorBox);
		
		this.indicatorIcon = St.TextureCache.get_default().load_uri_async(this.indicatorIconFile.get_uri(), Panel.PANEL_ICON_SIZE, Panel.PANEL_ICON_SIZE);
		this.indicatorIconMakeGrayscale(true);
		this.indicatorBox.add_actor(this.indicatorIcon);
		
		this.indicatorLabel = new St.Label({text: "0 KB/s", style_class: "indicator-label", visible: this.settings.get_boolean(Settings.SHOWSPEED)});
		this.indicatorBox.add_actor(this.indicatorLabel);
	},
	
	buildMenu: function() {
		this.setMenu(new PopupMenu.PopupMenu(this.actor, 0.0, St.Side.TOP));
		
		this.pauseSwitch = new PopupMenu.PopupSwitchMenuItem(("Pause Downloads"), false);
		this.pauseSwitch.connect("toggled", Lang.bind(this, this.pauseDownloads));
		this.menu.addMenuItem(this.pauseSwitch);
		
		this.webLink = new PopupMenu.PopupMenuItem("Open Web Interface");
		this.webLink.connect("activate", Lang.bind(this, this.openWebInterface));
		this.menu.addMenuItem(this.webLink);
		
		this.prefs = new PopupMenu.PopupMenuItem("Extension Settings");
		this.prefs.connect("activate", Lang.bind(this, this.openPrefs));
		this.menu.addMenuItem(this.prefs);
		
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		
		this.queueHeading = new PopupMenu.PopupMenuItem("Queue", {reactive: false});
		this.menu.addMenuItem(this.queueHeading);
		this.menu.addMenuItem(new PopupMenu.PopupMenuItem("Loading...", {reactive: false, style_class: "queue-item"}));
		
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		
		this.historyHeading = new PopupMenu.PopupMenuItem("History", {reactive: false});
		this.menu.addMenuItem(this.historyHeading);
		this.menu.addMenuItem(new PopupMenu.PopupMenuItem("Loading...", {reactive: false, style_class: "history-item"}));
	},
	
	watchSettings: function() {
		this.settings.connect("changed::" + Settings.URL, Lang.bind(this, function() {
			this.update();
		}));
		
		this.settings.connect("changed::" + Settings.APIKEY, Lang.bind(this, function() {
			this.update();
		}));
		
		this.settings.connect("changed::" + Settings.SHOWSPEED, Lang.bind(this, function() {
			this.indicatorLabel.visible = this.settings.get_boolean(Settings.SHOWSPEED);
		}));
	},
	
	pauseDownloads: function() {
		let url = [
			this.settings.get_string(Settings.URL) + "/api?"
			, "mode=" + (this.pauseSwitch.state ? "pause" : "resume")
			, "output=json"
			, "apikey=" + this.settings.get_string(Settings.APIKEY)
		];
		
		let message = Soup.Message.new("GET", url.join("&"));
		
		this.transport.queue_message(message, Lang.bind(this, function(session, message) {
			let data = JSON.parse(message.response_body.data);
			
			if (data.status && !this.pauseSwitch.state) {
				this.indicatorIconMakeGrayscale(false);
				
				this.updateDelay = 1000 * 1.5;
				this.update();
			} else {
				this.indicatorLabel.text = "0 KB/s";
				this.indicatorIconMakeGrayscale(true);
				
				this.updateDelay = 1000 * 30;
				this.update();
			}
		}));
	},
	
	openWebInterface: function() {
		Gio.AppInfo.launch_default_for_uri(this.settings.get_string(Settings.URL), global.create_app_launch_context());
	},
	
	openPrefs: function() {
		Util.spawnCommandLine("gnome-shell-extension-prefs " + Extension.metadata.uuid);
	},
	
	update: function() {
		this.updateQueue();
		this.updateHistory();
	},
	
	updateQueue: function() {
		if (this.queueTimeout) {
			Mainloop.source_remove(this.queueTimeout);
		}
		
		this.queueTimeout = Mainloop.timeout_add(this.updateDelay, Lang.bind(this, function() {
			let url = [
				this.settings.get_string(Settings.URL) + "/api?"
				, "mode=queue"
				, "start=0"
				, "limit=5" // future setting?
				, "output=json"
				, "apikey=" + this.settings.get_string(Settings.APIKEY)
			];
			
			let message = Soup.Message.new("GET", url.join("&"));
			
			this.transport.queue_message(message, Lang.bind(this, function(session, message) {
				let data = JSON.parse(message.response_body.data) || {error: "Unable to connect"};
				
				this.removeMenuItems("queue-item");
				
				if (data.error) {
					this.addMenuItem("Error: " + data.error, "", "queue-item", this.queueHeading.actor);
				} else {
					this.pauseSwitch.setToggleState(data.queue.paused);
					
					if (!this.pauseSwitch.state) {
						this.updateDelay = 1000 * 1.5; // used to keep in sync with web interface changes
						
						let speed = data.queue.kbpersec;
						
						if (speed < 1) {
							speed = "0 KB/s"; // we dont want to show B/s values
						} else {
							speed = "%s/s".format(GLib.format_size(data.queue.kbpersec * 1000).toUpperCase()); // force kB -> KB to match the web ui
							
							// drop the decimals for values like 45.5 KB but not for 1.9 MB
							speed = speed.replace(/(\d+)\.\d (KB)/, "$1 $2");
						}
						
						this.indicatorLabel.text = speed; 
						this.indicatorIconMakeGrayscale(false);
					} else {
						this.updateDelay = 1000 * 30; // used to keep in sync with web interface changes
						
						this.indicatorLabel.text = "0 KB/s";
						this.indicatorIconMakeGrayscale(true);
					}
					
					if (data.queue.slots.length === 0) {
						this.addMenuItem("Empty", "", "queue-item", this.queueHeading.actor);
					} else {
						if (data.queue.noofslots >  5) {
							this.addMenuItem(data.queue.noofslots + " more", "", "queue-item", this.queueHeading.actor);
						}
						
						for (let i = data.queue.slots.length - 1; i >= 0; i--) {
							let slot = data.queue.slots[i];
							this.addMenuItem(slot.filename, slot.percentage + "%", "queue-item", this.queueHeading.actor);
						}
					}
				}
				
				this.updateQueue();
			}));
		}));
	},
	
	updateHistory: function() {
		if (this.historyTimeout) {
			Mainloop.source_remove(this.historyTimeout);
		}
		
		this.historyTimeout = Mainloop.timeout_add(this.updateDelay, Lang.bind(this, function() {
			let url = [
				this.settings.get_string(Settings.URL) + "/api?"
				, "mode=history"
				, "start=0"
				, "limit=5" // future setting?
				, "output=json"
				, "apikey=" + this.settings.get_string(Settings.APIKEY)
			];
			
			let message = Soup.Message.new("GET", url.join("&"));
			
			this.transport.queue_message(message, Lang.bind(this, function(session, message) {
				let data = JSON.parse(message.response_body.data) || {error: "Unable to connect"};
				
				this.removeMenuItems("history-item");
				
				if (data.error) {
					this.addMenuItem("Error: " + data.error, "", "history-item", this.historyHeading.actor);
				} else {
					if (data.history.slots.length === 0) {
						this.addMenuItem("Empty", "", "history-item", this.historyHeading.actor);
					} else {
						if (data.history.noofslots >  5) {
							this.addMenuItem(data.history.noofslots + " more", "", "history-item", this.historyHeading.actor);
						}
						
						for (let i = data.history.slots.length - 1; i >= 0; i--) {
							let slot = data.history.slots[i];
							this.addMenuItem(slot.name, slot.size, "history-item", this.historyHeading.actor);
						}
					}
				}
				
				this.updateHistory();
			}));
		}));
	},
	
	// helper functions
	indicatorIconMakeGrayscale: function(grayscale) {
		if (grayscale) {
			if (!this.indicatorIcon.has_effects()) {
				this.indicatorIcon.add_effect_with_name("grayscale", this.indicatorIconEffect);
			}
		} else {
			this.indicatorIcon.remove_effect_by_name("grayscale");
		}
	},
	
	addMenuItem: function(label, number, styleClassName, afterItem) {
		let item = new PopupMenu.PopupBaseMenuItem({reactive: false, style_class: styleClassName});
		item.addActor(new St.Label({text: (label.length <= 53 ? label : label.substr(0, 25) + "..." + label.substr(-25))}));
		item.addActor(new St.Label({text: number}), {align: St.Align.END});
		
		this.menu.addMenuItem(item, this.menu.box.get_children().indexOf(afterItem) + 1);
	},
	
	removeMenuItems: function(styleClassName) {
		for (let i = 0, children = this.menu.box.get_children(); i < children.length; i++) {
			if (children[i].has_style_class_name(styleClassName)) {
				this.menu.box.remove_child(children[i]);
				children[i]._delegate.destroy();
			}
		}
	}
});