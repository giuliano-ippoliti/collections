// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('insertCollection.js loading...');

// name and properties of the collection (from /getCollectionInfo)
var name = "";
var properties = [];

const formDiv = document.getElementById("newCollection");
const itemForm = document.forms[0];
const nameInput = itemForm.elements['name'];
const propertiesInput = itemForm.elements['properties'];
const secretInput = itemForm.elements['secret'];

const findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index);

// Note: Arrow function expressions are ill suited as methods
// const checkAuthentication = () => { ... } does not work with "this" 
const checkAuthentication = function() {
	// parse our response (from /api/insertCollection) to convert to JSON
	
	//check status
	if (this.status == 200) {
		if (this.response == '{}') {
			alert('Authentication succeded, but duplicated item: insertion KO');
		}
		else {
			alert('Authentication succeded, insertion OK');
		}
	}
	else {
		alert('Authentication failed');
	}
}

const InsertRequest = new XMLHttpRequest();

InsertRequest.onload = checkAuthentication;

// function that inserts an item into the database file
const insertCollection = (apirequest) => {
	const url = '/api/insertCollection';

	InsertRequest.open("POST", url);
	InsertRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

	InsertRequest.send(JSON.stringify(apirequest));
}

// listen for the form to be submitted and add a new item when it is
itemForm.onsubmit = (event) => {
	// stop our form submission from refreshing the page
	event.preventDefault();
	console.log("new collection submitted");
	
	// check collection properties
	var inputProperties = propertiesInput.value;			// TODO forbid special caracters, and final,
	var inputPropertiesTrt = inputProperties.replace(/,\s+/g, ',');	// remove spaces after commas
	inputPropertiesTrt = inputPropertiesTrt.replace(/,+/g, ',');	// deduplicate multiple commas
	inputPropertiesTrt = inputPropertiesTrt.replace(/,+$/, '');	// remove trailing comma

	if (!inputPropertiesTrt.match(/^[0-9A-Za-z,]+$/)) {
		alert('Only letters and numbers are allowed for properties');
		return;
	}

	var propertiesList = inputPropertiesTrt.split(',');

	var duplicatedItems = findDuplicates(propertiesList);
	if (duplicatedItems.length > 0) {
		alert('Duplicate properties are not allowed');
		return;
	}

	// check collection name
	if (!nameInput.value.match(/^[0-9A-Za-z]+$/)) {
		alert('Only letters and numbers are allowed for the collection\'s name');
		return;
	}

	var apirequest = {};
	apirequest.collectionName = nameInput.value;
	apirequest.collectionProperties = propertiesList;
	apirequest.secret = secretInput.value;

	console.log(apirequest);

	// call API to insert item into the database base
	insertCollection(apirequest);

	// reset form
	nameInput.value = '';
	propertiesInput.value = '';
	secretInput.value = '';

	// TODO set focus, and avoid that browser asks for remembering values
};

