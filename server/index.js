const express = require('express');
const http = require('http');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5000;

var counter = 0;



// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`);
  });

} else {
  const app = express();
  const server = http.createServer(app);
  const io = require('socket.io')(server);

  setInterval(function () {
    counter++;
    console.log(io.sockets);
    io.sockets.emit('timer', { counter: counter });
  }, 1000);

  io.sockets.on('connection', function (socket) {
    socket.on('reset', function (data) {
      counter = 0;
      io.sockets.emit('timer', { counter: counter });
    });
  });


  // Priority serve any static files.
  app.use(express.static(path.resolve(__dirname, '../react-ui/build')));

  // Answer API requests.
  app.get('/api', function (request, response) {
    console.log('api call')
    response.set('Content-Type', 'application/json');
    response.send('{"message":"Hello from MY custom server!"}');
  });

  // All remaining requests return the React app, so it can handle routing.
  app.get('*', function (request, response) {
    response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
  });

  io.on('connection', function (client) {
    console.log(`a user ${client.id} connected`);
    client.on('disconnect', function () {
      console.log('user disconnected');
    });
  });

  server.listen(PORT, function () {
    console.error(`Node ${isDev ? 'dev server' : 'cluster worker ' + process.pid}: listening on port ${PORT}`);
  });
  // app.listen(PORT, function () {
  //   console.error(`Node ${isDev ? 'dev server' : 'cluster worker ' + process.pid}: listening on port ${PORT}`);
  // });
}
