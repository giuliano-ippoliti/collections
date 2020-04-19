// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('displayCollection.js loading...');

// Start with an empty array
let items = [];

const getUrlVars = function() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}

const vars = getUrlVars();
const collectionName = vars.collectionName;
const editMode = vars.editMode;			// if editMode is set: each item includes a link for editing

// Set title and header
document.title = collectionName;
const page_header = document.getElementById("page_header");
if (editMode != "1") {
	page_header.innerHTML = collectionName;
}
else {
	page_header.innerHTML = collectionName + ' - Edit mode (click on items id to edit)';
}

// a helper function that displays a new item
const appendNewItem = (item) => {
	const newDiv = document.createElement('div');

	// Brutal way of converting object to text. Some work to do here. TODO
	//var itemText = JSON.stringify(item, null, '  ');

	// HTML table from array of objects
	var itemText = JSON2HTMLtext(item);

	newDiv.innerHTML = itemText;

	document.body.appendChild(newDiv);
}

const appendInsertLink = () => {
	const newDiv = document.createElement('div');

	var insertLink = '<a href=/insertItem?collectionName=' + collectionName + '>Insert item</a>';
	var editLink = '<a href=/displayCollection?collectionName=' + collectionName + '&editMode=1>Edit collection</a>';

	newDiv.innerHTML = insertLink + '<br>' + editLink;

	document.body.appendChild(newDiv);
}

// OWASP : Except for alphanumeric characters, escape all characters with ASCII values less than 256 with the &#xHH; format (or a named entity if available) to prevent switching out of the attribute.
const OWASPescape = (str) => {
	return str.replace(/[%*+,-/;<=>^|]/g, '-');
} 

function escapeHtml(text) {
	var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
 
	return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

const JSON2HTMLtext = (item) => {
	var txt = "";
	var value;
	for (x in item) {
		// beware of XSS!
		// https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet

		if (x == "id") {
			if (editMode != "1") { continue; }
			value = '<a href=/insertItem?collectionName=' + collectionName + '&itemId=' + item[x] + '>' + item[x] + '</a>';
		}
		else {
			value = escapeHtml(item[x]);
		}

		txt += "<b>" + escapeHtml(x) + "</b>: " + value + "<br>";
	}
	txt += "<br>" ;
	return txt;
}

// a helper function to call when our request for items is done (callback triggered after the completion of the XMLHttpRequest)
// cf DisplayRequest.onload = displayItems;
const displayItems = function() {
	// parse our response (from /api/getCollectionItems) to convert to JSON
	items = JSON.parse(this.response);

  	// iterate through every item and add it to our page
  	items.forEach( (item) => {
    		appendNewItem(item);
  	});

	appendInsertLink();
}

// Use XMLHttpRequest (XHR) objects to interact with servers
const DisplayRequest = new XMLHttpRequest();

var apirequest = {};
apirequest.collectionName = collectionName;

const url = '/api/getCollectionItems';

DisplayRequest.open("POST", url);

DisplayRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

DisplayRequest.send(JSON.stringify(apirequest));

DisplayRequest.onload = displayItems;


