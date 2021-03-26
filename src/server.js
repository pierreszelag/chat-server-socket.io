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

/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.use("/", express.static(__dirname + "/public"));

io.on('connection', function (socket) {

  /**
   * Log de connexion et de déconnexion des utilisateurs
   */
  console.log('a user connected');
  socket.on('disconnect', function () {
    console.log('user disconected');
  });

  /**
   * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
   */
  socket.on('chat-message', function (message) {
    var newMsg = new Msg({msg : message.text});
    newMsg.save(function(err){
      if(err) throw err;
      io.emit('chat-message', message);
    })
    //io.emit('chat-message', message);
  });
});

/**
 * Lancement du serveur en écoutant les connexions arrivant sur le port 3000
 */
http.listen(3000, function () {
  console.log('Server is listening on *:3000');
});