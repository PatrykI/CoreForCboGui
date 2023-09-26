sap.ui.define([
	"sap/ui/core/Core",
	"sap/ui/core/library"
],function(Core, Library) {
	"use strict";

	sap.ui.getCore().initLibrary({
		name : "coreforcbogui",
		noLibraryCSS: true,
		dependencies : [
			"sap.ui.core"
		],
		types: [],
		interfaces: [],
		controls: ["coreforcbogui.controller.CoreForCboGui"],
		elements: [],
		version: "1.0.0"
	});

	return coreforcbogui;

}, /* bExport= */ false);
