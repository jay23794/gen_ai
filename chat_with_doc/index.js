

import express from 'express';
import routeChat from './routes/routeChat.js'
import routeVector from './routes/routeVectorSearch.js'
const app = express();


const port = 3000;

app.use(express.json());
app.use('/chat', routeChat);
app.use('/api', routeVector);
app.listen(port, function (err) {
    if (err) throw err;
    console.log("servers is up on port abc", +port);
  });