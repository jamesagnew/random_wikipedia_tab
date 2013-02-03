var storage = chrome.storage.local;
var syncStorage = chrome.storage.sync;
var langPanelAlreadyPopulated = false;

console.log("Starting");

// Set up button listeners
document.getElementById("andThenButton").addEventListener("click", function() {
	andThen();
});
document.getElementById("languagesButton").addEventListener("click", function() {
	toggleLanguagesPanel();
});

tryToBringUpCachedPage();
googleAnalytics();
syncPrefs();

function tryToBringUpCachedPage() {
	storage.get({
		'cachedPages' : new Array(),
		'languages' : new Array()
	}, function(items) {
		var cachedPages = items.cachedPages;
		var languages = items.languages;

		if (cachedPages.length > 0) {
			document.getElementById('htmlContents').innerHTML = cachedPages.shift();
			setUpNext(cachedPages);

			storage.set({
				'cachedPages' : cachedPages
			});
		}

		console.log("Load some more? " + cachedPages.length);

		if (cachedPages.length < 10) {
			pullRequest(cachedPages, languages);
		}

	});
}

function googleAnalytics() {
	var _gaq = _gaq || [];
	_gaq.push([ '_setAccount', 'UA-38009834-1' ]);
	_gaq.push([ '_trackPageview' ]);

	(function() {
		var ga = document.createElement('script');
		ga.type = 'text/javascript';
		ga.async = true;
		ga.src = 'https://ssl.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0];
		s.parentNode.insertBefore(ga, s);
	})();
}

function setUpNext(cachedPages) {
	if (cachedPages.length > 0) {
		html = cachedPages[0];
		document.getElementById('upNext').innerHTML = extractTitle(html);
	}
}

function extractTitle(html) {
	var titleMatches = html.match(/\<title\>.* - /);
	if (titleMatches == null) {
		console.log("Found null entry");
		return "";
	}
	if (titleMatches.length > 0) {
		var title = titleMatches[0].replace("<title>", "").replace(" - ", "");
		return title;
	}

	return "";
}

function getPermissionName(langCode) {

	// Wikipedia
	if (langCode in allLangs) {
		return "http://" + allLangs[langCode] + ".wikipedia.org/";
	}
	for ( var i in allLangs) {
		if (allLangs[i] == langCode) {
			return "http://" + allLangs[i] + ".wikipedia.org/";
		}
	}

	// Wikia
	if (langCode in allWikia) {
		return "http://" + allWikia[langCode] + ".wikia.com/";
	}
	for ( var i in allWikia) {
		if (allWikia[i] == langCode) {
			return "http://" + allWikia[i] + ".wikia.com/";
		}
	}

	console.log("Couldn't find language: " + langCode);
}

function pullRequest(cachedPages, languages) {
	var languagesToChooseFrom = new Array();

	for ( var nextLang in allLangs) {
		if (languages.indexOf(nextLang) != -1) {
			languagesToChooseFrom.push(allLangs[nextLang]);
		}
	}
	for ( var nextLang in allWikia) {
		if (languages.indexOf(nextLang) != -1) {
			languagesToChooseFrom.push(allWikia[nextLang]);
		}
	}

	var langCode;
	if (languagesToChooseFrom.length > 0) {
		langCode = languagesToChooseFrom[Math.floor(Math.random() * languagesToChooseFrom.length)];
	} else {
		langCode = 'en';
	}

	console.log("Languages to choose from: " + languages + " / " + languagesToChooseFrom + ", using lang: " + langCode);

	var url = getPermissionName(langCode) + "wiki/Special:Random";
	console.log("Making pull rerquest to " + url);

	chrome.permissions.contains({
		origins : [ getPermissionName(langCode) ]
	}, function(result) {
		if (!result) {
			console.log("Couldn't get access to non-english Wiki. Oh well..");
			url = "http://en.wikipedia.org/wiki/Special:Random";
		}

		var xhr = new XMLHttpRequest();

		xhr.open("GET", url, true);
		xhr.onreadystatechange = function() {
			console.log("State change " + xhr.readyState);

			if (xhr.readyState == 4) {

				// console.log("Response: " + xhr.responseText);

				var html = (xhr.responseText.replace(/href="\/\//g, 'href="http://'));
				if (html == "") {
					console.log("Looks like response is empty. Text was: " + xhr.responseText);
					console.log(" * Status was: " + xhr.status + " - " + xhr.statusText);
					return;
				}
				html = html.replace(/href="\//g, 'href="http://en.wikipedia.org/');
				html = html.replace(/src="\/\//g, 'src="http://');
				html = html.replace(/url\(\/\//g, 'url(http://');

				if (document.getElementById('htmlContents').innerHTML.length > 0) {
					storage.get({
						'cachedPages' : new Array()
					}, function(items) {

						if (cachedPages.indexOf(html) == -1) {
							cachedPages.push(html);
						}

						storage.set({
							'cachedPages' : cachedPages
						});

						setUpNext(cachedPages);
					});

				} else {
					document.getElementById('htmlContents').innerHTML = html;
				}

				if (cachedPages.length < 10) {
					pullRequest(cachedPages, languages);
				}

			}
		}

		xhr.send();

	});

}

function andThen() {
	console.log("Clicked and then");
	var andThen = document.getElementById('andThenPanel');
	if (andThen.className == 'andThenPanelInactive') {
		andThen.className = 'andThenPanel';
		redrawAndThen();
	} else {
		andThen.className = 'andThenPanelInactive';
	}

}

function redrawAndThen() {
	var andThen = document.getElementById('andThenPanel');
	while (andThen.hasChildNodes()) {
		andThen.removeChild(andThen.lastChild);
	}

	var titleDiv = document.createElement("span");
	titleDiv.className = "upNextTitleDiv";
	titleDiv.innerText = "Coming soon to a tab near you:";
	andThen.appendChild(titleDiv);
	andThen.appendChild(document.createElement("br"));

	storage.get({
		'cachedPages' : new Array()
	}, function(items) {
		var cachedPages = items.cachedPages;
		for ( var nextIdx in cachedPages) {
			var next = cachedPages[nextIdx];
			var title = extractTitle(next);

			var titleDiv = document.createElement("span");
			titleDiv.innerText = title;
			titleDiv.className = "upNextEntryDiv";
			andThen.appendChild(titleDiv);
			andThen.appendChild(document.createElement("br"));

			var handler = {
				handleEvent : function() {
					selectUpNextEntry(this.myHtml);
				},
				myHtml : next
			};
			titleDiv.addEventListener("click", handler, false);
		}
	});

}

function removeA(arr) {
	var what, a = arguments, L = a.length, ax;
	while (L > 1 && arr.length) {
		what = a[--L];
		while ((ax = arr.indexOf(what)) !== -1) {
			arr.splice(ax, 1);
		}
	}
	return arr;
}

function selectUpNextEntry(html) {
	storage.get({
		'cachedPages' : new Array(),
		'languages' : new Array()
	}, function(items) {
		var cachedPages = items.cachedPages;
		var languages = items.languages;

		document.getElementById('htmlContents').innerHTML = html;

		removeA(cachedPages, html);

		setUpNext(cachedPages);

		storage.set({
			'cachedPages' : cachedPages
		});

		if (cachedPages.length < 10) {
			pullRequest(cachedPages, languages);
		}

		redrawAndThen();
	});

}

function populateLanguagesPanel() {
	if (langPanelAlreadyPopulated) {
		return;
	}
	langPanelAlreadyPopulated = true;

	storage.get({
		'languages' : new Array()
	}, function(items) {
		var languages = items.languages;
		var cont = document.getElementById("languagesSubPanel");
		populateLanguagesPanelWith(languages, allLangs, cont);

		cont = document.getElementById("wikiaSubPanel");
		populateLanguagesPanelWith(languages, allWikia, cont);

	});
}

function populateLanguagesPanelWith(theLanguages, theLangsList, theContainer) {
	for ( var nextLang in theLangsList) {
		var nobr = document.createElement('nobr');
		theContainer.appendChild(nobr);
		theContainer.appendChild(document.createElement('br'));

		var cb = document.createElement('input');
		cb.type = 'checkbox';
		cb.className = 'langCheckbox';
		cb.id = "langcb_" + nextLang;
		cb.checked = theLanguages.indexOf(nextLang) != -1;
		nobr.appendChild(cb);

		// console.log("Lang '" + nextLang + "' and len: " +
		// languages.length + ' is ' + (nextLang == "English"));
		if (nextLang == "English" && theLanguages.length == 0) {
			cb.checked = true;
		}

		var label = document.createElement("label");
		label.htmlFor = "langcb_" + nextLang;
		label.innerHTML = nextLang + "&nbsp;&nbsp;&nbsp;&nbsp;";
		nobr.appendChild(label);

		var handler = {
			handleEvent : function() {
				toggleLanguage(this.myLanguage, this.myCb.checked);
				if (this.myCb.checked) {
					var langPerm = getPermissionName(this.myLanguage);
					console.log("Checking if we need permission to " + langPerm);
					chrome.permissions.request({
						origins : [ langPerm ]
					});
				}
			},
			myLanguage : nextLang,
			myCb : cb
		};
		cb.onchange = handler;

	}
}

function toggleLanguage(language, value) {
	console.log("Language " + language + " is " + value);

	storage.get({
		'languages' : new Array()
	}, function(items) {
		var languages = items.languages;

		if (value && languages.indexOf(language) == -1) {
			if (languages.length == 0 && language != 'English') {
				languages.push("English");
			}
			languages.push(language);
		}

		if (!value) {
			var oldLanguages = languages;
			languages = new Array();
			for ( var next in oldLanguages) {
				if (oldLanguages[next] != language && allLangs[oldLanguages[next]] != null) {
					languages.push(oldLanguages[next]);
				}
			}
		}

		console.log("Languages are now: " + languages);

		storage.set({
			'languages' : languages
		});

		syncStorage.set({
			'languages' : languages
		});

	});

}

function showRequestAdditionalPermissionsWarningIfNeeded() {
	// permissionWarningDiv

	storage.get({
		'languages' : new Array()
	}, function(items) {
		var languages = items.languages;
		var languagePerms = new Array();
		for ( var nextLang in languages) {
			languagePerms.push(getPermissionName(languages[nextLang]));
		}

		chrome.permissions.contains({
			origins : languagePerms
		}, function(result) {
			if (!result) {

				document.getElementById("permissionWarningDiv").style.display = "";
				document.getElementById("permissionWarningImg").addEventListener("click", function() {
					console.log("Requesting permissions: " + languagePerms);
					chrome.permissions.request({
						origins : languagePerms
					});
				});

			}
		});

	});

}

function toggleLanguagesPanel() {
	var panel = document.getElementById("languagesPanel");
	if (panel.className == "languagesPanel") {
		panel.className = "languagesPanelInactive";
	} else {
		populateLanguagesPanel();
		panel.className = "languagesPanel";
	}
}

function syncPrefs() {
	console.log("Starting storage sync");

	storage.get({
		'languages' : new Array()
	}, function(items) {
		var languages = items.languages;

		syncStorage.get({
			'languages' : new Array()
		}, function(syncItems) {
			var syncLanguages = syncItems.languages;

			if (syncLanguages.length == 0) {
				console.log("No languages stored in sync");
				return;
			}

			if (!arraysEqual(languages, syncLanguages)) {
				console.log("Languages not in sync - Updating");
				storage.set({
					'languages' : syncLanguages
				});
			} else {
				console.log("Languages already in sync");
			}

			// Put up the warning icon to request additional perms
			showRequestAdditionalPermissionsWarningIfNeeded();
		});

	});
}

function arraysEqual(a1, a2) {
	return JSON.stringify(a1) == JSON.stringify(a2);
}