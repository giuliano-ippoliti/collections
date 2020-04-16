// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('index.js loading...');

// Start with an empty array
let collections = [];

// a helper function to call when our request for items is done (callback triggered after the completion of the XMLHttpRequest)
// cf DisplayRequest.onload = displayItems;
const displayCollections = function() {
	collections = JSON.parse(this.response);

  	// iterate through every item and add it to our page
  	collections.forEach( (collection) => {
    		appendNewCollection(collection);
  	});
}

const DisplayRequest = new XMLHttpRequest();

DisplayRequest.onload = displayCollections;

DisplayRequest.open('get', '/api/getCollections');

DisplayRequest.send();

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

// a helper function that displays a new item
const appendNewCollection = (collection) => {
	const newDiv = document.createElement('div');

	var collectionText = '<a href=/displayCollection?collectionName=' + escapeHtml(collection) + '>' + escapeHtml(collection) + '</a>';

	newDiv.innerHTML = collectionText;

	document.body.appendChild(newDiv);
}

