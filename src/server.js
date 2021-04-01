/**
 * Le serveur est capable de gérer un salon de discussion instatanée 
 * pour un nombre maximal de 2 personnes connectées en meme temps
 */
var capacite_max = 2;

/**
 * Liste des utilisateurs connectés
 */
var users = [];

/**
 * Historique des messages
 */
var messages = [];

// Tout d'abord on initialise notre application avec le framework Express 
// et la bibliothèque http integrée à node.
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/msg', function(err){
  if(err){
    console.log(err);
  }else{
    console.log('connected to db');
  }
});

var msgSchema = mongoose.Schema({
  username: {
    type : String,
    default : "unknown"
  },
  msg: String,
  timestamp : {
    type : Date,
    default : Date.now
  },
});

var Msg = mongoose.model('Message', msgSchema);

// On gère les requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
app.use("/", express.static(__dirname + "/public"));

// On lance le serveur en écoutant les connexions arrivant sur le port 3000
http.listen(3000, function(){
  console.log('Server is listening on *:3000');
});

// Listener de connection d'un client (quand il charge la page localhost:3000)
io.on('connection', function (socket) {

  /**
   * Utilisateur connecté à la socket
   */
  var loggedUser;

  /**
   * Déconnexion d'un utilisateur : broadcast d'un 'service-message'
   */
  socket.on('disconnect', function () {
    if (loggedUser !== undefined) {
      // Broadcast d'un 'service-message'
      var serviceMessage = {
        text: 'User "' + loggedUser.username + '" disconnected',
        type: 'logout'
      };
      socket.broadcast.emit('service-message', serviceMessage);
      
      // Redis
      const redis = require("redis");
      const client = redis.createClient();

      client.on("error", function(error) {
      console.error(error);
      });

      client.decr('nb_connexions')

      // Suppression de la liste des connectés
      var userIndex = users.indexOf(loggedUser);
      if (userIndex !== -1) {
        users.splice(userIndex, 1);
      }
      messages.push(serviceMessage);
      // Emission d'un 'user-logout' contenant le user
      io.emit('user-logout', loggedUser);
    }
  });

  /**
  * Connexion d'un utilisateur via le formulaire :
  */
  socket.on('user-login', function (user, callback) {
  // Vérification que l'utilisateur n'existe pas
  var userIndex = -1;
  for (i = 0; i < users.length; i++) {
    if (users[i].username === user.username) {
      userIndex = i;
    }
  }
  if (user !== undefined && userIndex === -1) { // S'il est bien nouveau

    // Redis
    const redis = require("redis");
    const client = redis.createClient();
    
    async function userRedis() {
      client.get('nb_connexions', function(err, reply) {
        if (reply == null || users.length == 0){
          client.set('nb_connexions', 1);
          client.expire('nb_connexions', 300);
        } else if (parseInt(reply) < capacite_max) {
          client.incr('nb_connexions')
        }
      });
    }

    // Appel de la fonctionne asynchrone pour gérer Redis
    userRedis()
    .then(checkNumberUsers());
    
    function checkNumberUsers(){
      if (users.length<capacite_max) {
        // Sauvegarde de l'utilisateur et ajout à la liste des connectés
        loggedUser = user;
        users.push(loggedUser);
        // Envoi des messages de service
        var userServiceMessage = {
          text: 'You logged in as "' + loggedUser.username + '"',
          type: 'login'
        };
        var broadcastedServiceMessage = {
          text: 'User "' + loggedUser.username + '" logged in',
          type: 'login'
        };
        socket.emit('service-message', userServiceMessage);
        socket.broadcast.emit('service-message', broadcastedServiceMessage);
        messages.push(broadcastedServiceMessage);
        // Emission de 'user-login' et appel du callback
        io.emit('user-login', loggedUser);
        callback(true);
      } else {
        callback("surcharge redis");
      }
    }
  } else {
      callback(false);
    }
  });

    /**
    * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
    * Ajout à la liste des messages et purge si nécessaire
    */
    socket.on('chat-message', function (message) {
    message.username = loggedUser.username;
    var newMsg = new Msg({msg : message.text, username : message.username});
    newMsg.save(function(err){
        if(err) throw err;
        io.emit('chat-message', message);
      })
    messages.push(message);
    if (messages.length > 150) {
      messages.splice(0, 1);
    }
    });

    /**
    * Emission d'un événement "user-login" pour chaque utilisateur connecté
    */
    for (i = 0; i < users.length; i++) {
        socket.emit('user-login', users[i]);
    }

    /** 
    * Emission d'un événement "chat-message" pour chaque message de l'historique
    */
    for (i = 0; i < messages.length; i++) {
        if (messages[i].username !== undefined) {
        socket.emit('chat-message', messages[i]);
        } else {
        socket.emit('service-message', messages[i]);
        }
    }
    });