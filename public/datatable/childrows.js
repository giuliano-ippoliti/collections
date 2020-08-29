/* eslint-disable linebreak-style */
/* Formatting function for row details - modify as you need */
/* global document */
/* eslint-disable indent */
const tabledata = JSON.parse(document.currentScript.getAttribute('tabledata'));
const shortProperties = JSON.parse(document.currentScript.getAttribute('shortProperties'));
const longProperties = JSON.parse(document.currentScript.getAttribute('longProperties'));

let properties = shortProperties.concat(longProperties);
properties = properties.filter((value) => value !== 'nom');

let table;

function format(d) {
    // `d` is the original data object for the row
    //  collection.item[i]
    let tableCode = '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">';

    properties.forEach((element) => {
        const key = element;
        let value = d[element];

        const isLink = value.match(/^https?:\/\//)
        const isImage = key.match(/^(image|photo)/)
            if (isLink) {
                value = `<a href="${value}" target="_blank">${key}</a>`;
            }
            else if (isImage) {
                value = `<img src=/images/${value} style='max-width:50%'>`;
            }

        // eslint-disable-next-line prefer-template
        tableCode += '<tr>'
        + '<td style="white-space:pre-wrap">' + key + ':</td>'
        + '<td style="white-space:pre-wrap">' + value + '</td>'
        + '</tr>';
    });

    tableCode += '</table>';

    return tableCode;
}

// eslint-disable-next-line no-unused-vars
function devAll() {
    const checkBox = document.getElementById('expand');
    
    $('#collection > tbody  > tr').each(function(index, tr) { 
        let row = table.row( tr );
        //console.log(row);

        if (checkBox.checked == true) {
            if (! row.child.isShown() ) {
                // Open this row
                row.child( format(row.data()) ).show();
                $('table tr').addClass('shown');
            }
        }
        else {
            if ( row.child.isShown() ) {
                // This row is already open - close it
                row.child.hide();
                $('table tr').removeClass('shown');
            }
        }
    });
}

$(document).ready(function() {
    table = $('#collection').DataTable( {
        "data": tabledata,
        "pageLength": 100,
        "columns": [
            {
                "className":      'details-control',
                "orderable":      false,
                "data":           null,
                "defaultContent": ''
            },
            { "data": "nom" }
        ],
        "paging":   false,
        "ordering": false,
        "info":     false,
        "language": {
            "lengthMenu": "Afficher _MENU_ éléments",
            "search": "Rechercher:",
            "info": "Affichage de l'élément _START_ à _END_ sur _TOTAL_ éléments",
            "paginate": {
                "first": "Premier",
                "last": "Dernier",
                "next": "Suivant",
                "previous": "Précédent"
            },
        }
    } );
     
    // Add event listener for opening and closing details
    $('#collection tbody').on('click', 'td.details-control', function () {
        let tr = $(this).closest('tr');
        let row = table.row( tr );
 
        if ( row.child.isShown() ) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            row.child( format(row.data()) ).show();
            tr.addClass('shown');
        }
    } );
} );