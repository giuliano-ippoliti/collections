// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('insertItem.js loading...');

const getUrlVars = function() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}

const vars = getUrlVars();
const collectionName = vars.collectionName;
const itemId = vars.itemId;			// if itemId is set: edit mode (changes affect the referenced item)

console.log(itemId);

// Set title and header
document.title = collectionName;
const page_header = document.getElementById("page_header");
page_header.innerHTML = collectionName;

// form (including input text field and submit button)
const formDiv = document.getElementById("properties");
const itemForm = document.forms[0];

// will be filled after calling /api/getCollectionProperties
var properties = [];

const checkInsertedItem = function() {
	// parse our response (from /insertItems) to convert to JSON
	console.log(this.status);
	
	//check status
	if (this.status == 200) {
		alert('Item successfully inserted');
		// TODO load index.html
	}
	else {
		alert('Invalid secret');
	}

}

// Use XMLHttpRequest (XHR) objects to interact with servers
const GetPropertiesRequest = new XMLHttpRequest();
const InsertRequest = new XMLHttpRequest();

const addStaticElements = function() {
	var secretlabel = document.createTextNode("Secret");
	itemForm.appendChild(secretlabel);
	secret = document.createElement("input");
	secret.type = "password";
	secret.name = "secret";
	itemForm.appendChild(secret);

	//create button
	var button = document.createElement("button");
	button.type = "submit";
	if (itemId == undefined) {
		button.innerHTML = "Add item";
	}
	else {
		button.innerHTML = "Save changes for this item";
	}
	itemForm.appendChild(button);

	// link back to displyCollection
	const backDiv = document.createElement('div');
	var backLink = '<a href=/displayCollection?collectionName=' + collectionName + '&editMode=0>Back</a>';
	backDiv.innerHTML = '<br>' + backLink;
	document.body.appendChild(backDiv);
}

// input values are empty (insert mode)
const displayInfo = function() {
	// parse our response (from /api/getCollectionInfo) to convert to JSON
	properties = JSON.parse(this.response);

	// create inputs
	properties.forEach( (item) => {
		var label = document.createTextNode(item);
		itemForm.appendChild(label);

		var input = document.createElement("input");
		input.type = "text";
		input.name = item;
		itemForm.appendChild(input);
	});

	addStaticElements();
}

// input values are filled with item's value (edit mode)
const displayItemInfo = function() {
	// parse our response (from /api/getCollectionSpecificItem) to convert to JSON
	var specificItem = JSON.parse(this.response);
	for (prop in specificItem) {
		if (prop == "id") { continue; };
		properties.push(prop);				// useful to fill the properties array (cf itemForm.onsubmit)

		var label = document.createTextNode(prop);
		itemForm.appendChild(label);

		var input = document.createElement("input");
		input.type = "text";
		input.name = prop;
		input.value = specificItem[prop];
		itemForm.appendChild(input);
	}

	addStaticElements();
}

var getApi = {};
getApi.collectionName = collectionName;

if (itemId == undefined) {				// new item
	GetPropertiesRequest.onload = displayInfo;

	// Get properties for the collection
	GetPropertiesRequest.open('post', '/api/getCollectionProperties');
	GetPropertiesRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	GetPropertiesRequest.send(JSON.stringify(getApi));
}
else {							// edit item
	getApi.itemId = itemId;

	GetPropertiesRequest.onload = displayItemInfo;

	// Get specific items in the collection for editing
	GetPropertiesRequest.open('post', '/api/getCollectionSpecificItem');
	GetPropertiesRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

	GetPropertiesRequest.send(JSON.stringify(getApi));
}

InsertRequest.onload = checkInsertedItem;

// function that inserts an item into the database file for the given collection
const insertItem = (apirequest) => {
	const url = '/api/insertItemInCollection';

	InsertRequest.open("POST", url);
	InsertRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

	InsertRequest.send(JSON.stringify(apirequest));
}

// listen for the form to be submitted and add a new item when it is
itemForm.onsubmit = function(event) {
	// stop our form submission from refreshing the page
	event.preventDefault();

	console.log("request submitted");

	// get item value and add it to the list
	var item1 = {};

	properties.forEach( (item) => {
		item1[item] = itemForm.elements[item].value;
	});

	if (itemId != undefined) {		// add itemId to the request
		item1["itemId"] = itemId;
	}

	var apisecret = secret.value;

	var apirequest = {};
	apirequest.collectionName = collectionName;
	apirequest.item = item1;
	apirequest.secret = apisecret;

	// call API to insert item into the database base
	insertItem(apirequest);

	// reset form
	properties.forEach( (item) => {
		itemForm.elements[item].value = '';
	});
	secret.value = '';
};

