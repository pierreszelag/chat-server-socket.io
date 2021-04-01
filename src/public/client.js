/*jslint browser: true*/

/**
 * Scroll vers le bas de page si l'utilisateur n'est pas remonté pour lire d'anciens messages
 */
function scrollToBottom() {
    if ($(window).scrollTop() + $(window).height() + 2 * $('#messages li').last().outerHeight() >= $(document).height()) {
      $("html, body").animate({ scrollTop: $(document).height() }, 0);
    }
  }

var socket = io();

$('#sendMessage').submit(function(e) {
	e.preventDefault();
  var message = {
    text : $('#m').val()
  };
  $('#m').val('');
  if (message.text.trim().length !== 0) { // Gestion message vide
    socket.emit('chat-message', message);
  }
  $('#chat input').focus(); // Focus sur le champ du message
});

/**
 * Réception d'un message
 */
socket.on('chat-message', function (message) {
    $('#messages').append($('<li>').html('<span class="username">' + message.username + '</span> ' + message.text));
    scrollToBottom();
  });
  
  /**
   * Réception d'un message de service
   */
  socket.on('service-message', function (message) {
    $('#messages').append($('<li class="' + message.type + '">').html('<span class="info">information</span> ' + message.text));
    scrollToBottom();
  });

/**
 * Connexion de l'utilisateur
 * Uniquement si le username n'est pas vide et n'existe pas encore
 */

$('#login form').submit(function (e) {
  
    e.preventDefault();
    var user = {
      username : $('#login input').val().trim()
    };
    if (user.username.length > 0) { // Si le champ de connexion n'est pas vide
      socket.emit('user-login', user, function (success) {
        if (success == true) {
          $('body').removeAttr('id'); // Cache formulaire de connexion
          $('#chat input').focus(); // Focus sur le champ du message
        } else if (success == "surcharge redis") {
          $('#errorLogin').empty();
          $('#errorLogin').append($('<li>').html('<span class="errorRedis">' + 
          "Le serveur est surchargé. Veuillez attendre qu'un utilisateur se déconnecte pour entrer dans le salon" +
          '</span> '));
        } else {
          $('#errorLogin').empty();
          $('#errorLogin').append($('<li>').html('<span class="errorUsername">' + 
          "Ce nom d'utilisateur n'est pas disponible. Veuillez en choisir un autre" +
          '</span> '));
        }
      });
    }
  });

/**
 * Connexion d'un nouvel utilisateur
 */
socket.on('user-login', function (user) {
    $('#users').append($('<li class="' + user.username + ' new">').html(user.username));
    setTimeout(function () {
      $('#users li.new').removeClass('new');
    }, 1000);
  });
  
  /**
   * Déconnexion d'un utilisateur
   */
  socket.on('user-logout', function (user) {
    var selector = '#users li.' + user.username;
    $(selector).remove();
  });