# chat-server-socket.io

A web chat application based on an existing project (https://github.com/BenjaminBini/socket.io-chat/tree/part-1)

## Installation

Inside /src directory :
```
npm install
```

## Execution
Launch redis server :
```
redis-server
```
Get the 'data' folder in this repository for the replicaSets and launch mongoDB server :
```
mongod --port 27017 --dbpath data
```
Install dependences inside /src directory :
```
npm install
```
Launch nodejs server inside /src directory :
```
node server
```
