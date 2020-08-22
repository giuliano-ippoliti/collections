/* Formatting function for row details - modify as you need */
const tabledata = JSON.parse(document.currentScript.getAttribute('tabledata'));
const shortProperties = JSON.parse(document.currentScript.getAttribute('shortProperties'));
const longProperties = JSON.parse(document.currentScript.getAttribute('longProperties'));

var properties = shortProperties.concat(longProperties);
properties = properties.filter(function(value, index, arr){ return value != 'nom';});

var table;

//console.log(properties);

function format ( d ) {
    // `d` is the original data object for the row
    //  collection.item[i]
    // premier test en dur pour certifications TODO dynamiser
    var tableCode = '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">';

    properties.forEach(element => {
        var key = element;
        var value = d[element];

        var isLink = value.match(/^https?:\/\//)
        var isImage = key.match(/^(image|photo)/)
            if (isLink) {
                value = '<a href="' + value + '" target="_blank"> ' + key + '</a>';
            }
            else if (isImage) {
                value = '<img src=/images/' + value + ' style=\'max-width:50%\'>';
            }

        tableCode += '<tr>'+
        '<td style="white-space:pre-wrap">'+key+':</td>'+
        '<td style="white-space:pre-wrap">'+value+'</td>'+
    '</tr>'
    });

    tableCode += '</table>';

    return tableCode;
}
 
function devAll() {
    var checkBox = document.getElementById("expand");
    
    $('#collection > tbody  > tr').each(function(index, tr) { 
        var row = table.row( tr );
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
        var tr = $(this).closest('tr');
        var row = table.row( tr );
 
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