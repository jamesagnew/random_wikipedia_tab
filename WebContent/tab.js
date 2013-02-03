var storage = chrome.storage.local;
var syncStorage = chrome.storage.sync;
var langPanelAlreadyPopulated = false;

console.log("Starting");

// Set up button listeners
document.getElementById("andThenButton").addEventListener("click", function() {
	andThen();
});
document.getElementById("languagesButton").addEventListener("click",
		function() {
			toggleLanguagesPanel();
		});

storage.get({
	'cachedPages' : new Array(),
	'languages' : new Array()
},
		function(items) {
			var cachedPages = items.cachedPages;
			var languages = items.languages;

			if (cachedPages.length > 0) {
				document.getElementById('htmlContents').innerHTML = cachedPages
						.shift();
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

syncPrefs();

// function logTopElement(cachedPages) {
// if (cachedPages.length == 0) {
// console.log("No elements in cache");
// } else {
// html = cachedPages[0];
// var titleMatches = html.match(/\<title\>.* - /);
// if (titleMatches.length > 0) {
// var title = titleMatches[0].replace("<title>", "").replace(" - ", "");
// console.log("First element in cache of " + cachedPages.length + ": " +
// title);
// } else {
// console.log("First element has no title");
// }
// }
// }
//
// function logAddTitle(prefix, html) {
// var titleMatches = html.match(/\<title\>.* - /);
// if (titleMatches.length > 0) {
// var title = titleMatches[0].replace("<title>", "").replace(" - ", "");
// console.log(prefix + title);
// }
// }

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

function pullRequest(cachedPages, languages) {
	var languagesToChooseFrom = new Array();

	for ( var nextLang in allLangs) {
		if (languages.indexOf(nextLang) != -1) {
			languagesToChooseFrom.push(allLangs[nextLang]);
		}
	}

	var langCode;
	if (languagesToChooseFrom.length > 0) {
		langCode = languagesToChooseFrom[Math.floor(Math.random()
				* languagesToChooseFrom.length)];
	} else {
		langCode = 'en';
	}

	console.log("Languages to choose from: " + languages + " / "
			+ languagesToChooseFrom + ", using lang: " + langCode);

	var url = "http://" + langCode + ".wikipedia.org/wiki/Special:Random";
	console.log("Making pull rerquest to " + url);

	var xhr = new XMLHttpRequest();

	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		console.log("State change " + xhr.readyState);

		if (xhr.readyState == 4) {

			// console.log("Response: " + xhr.responseText);

			var html = (xhr.responseText
					.replace(/href="\/\//g, 'href="http://'));
			if (html == "") {
				console.log("Looks like response is empty. Text was: "
						+ xhr.responseText);
				console.log(" * Status was: " + xhr.status + " - "
						+ xhr.statusText);
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
	};

	xhr.send();
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

		for ( var nextLang in allLangs) {
			var nobr = document.createElement('nobr');
			cont.appendChild(nobr);
			cont.appendChild(document.createElement('br'));

			var cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.className = 'langCheckbox';
			cb.id = "langcb_" + nextLang;
			cb.checked = languages.indexOf(nextLang) != -1;
			nobr.appendChild(cb);

			// console.log("Lang '" + nextLang + "' and len: " +
			// languages.length + ' is ' + (nextLang == "English"));
			if (nextLang == "English" && languages.length == 0) {
				cb.checked = true;
			}

			var label = document.createElement("label");
			label.htmlFor = "langcb_" + nextLang;
			label.innerHTML = nextLang + "&nbsp;&nbsp;&nbsp;&nbsp;";
			nobr.appendChild(label);

			var handler = {
				handleEvent : function() {
					toggleLanguage(this.myLanguage, this.myCb.checked);
				},
				myLanguage : nextLang,
				myCb : cb
			};
			cb.onchange = handler;

		}

	});
}

function toggleLanguage(language, value) {
	console.log("Language " + language + " is " + value);

	storage.get({
		'languages' : new Array()
	}, function(items) {
		var languages = items.languages;

		if (value && languages.indexOf(language) == -1) {
			languages.push(language);
		}

		if (!value) {
			var oldLanguages = languages;
			languages = new Array();
			for ( var next in oldLanguages) {
				if (oldLanguages[next] != language
						&& allLangs[oldLanguages[next]] != null) {
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

		});

	});
}

function arraysEqual(a1, a2) {
	return JSON.stringify(a1) == JSON.stringify(a2);
}