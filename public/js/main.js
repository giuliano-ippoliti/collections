$(document).ready(function(){
  $('.delete-item').on('click', function(e){
    $target = $(e.target);
    const itemId = $target.attr('itemId');
    const collectionName = $target.attr('collectionName');
    if (confirm('Êtes-vous sûr ?')) {
      $.ajax({
        type:'DELETE',
        url: '/modify/'+collectionName+'/'+itemId,
        success: function(response){
          //$('html').html(response); // petite perte de formatage
          // TODO mieux passer dans le BODY :
          window.location.href='/show/'+collectionName+'?ok=Item deleted';
        },
        error: function(err){
          alert('Error deleting item');
          console.log(err);
        }
      });
    }
  });
  $('.delete-collection').on('click', function(e){
    $target = $(e.target);
    const collectionName = $target.attr('collectionName');
    if (confirm('Êtes-vous sûr ?')) {
      $.ajax({
        type:'DELETE',
        url: '/delete/'+collectionName,
        success: function(response){
          window.location.href='/collections?ok=Collection deleted';
        },
        error: function(err){
          alert('Error deleting collections');
          console.log(err);
        }
      });
    }
  });
});
