const express = require('express');
const cors = require('cors');

const corsOptions={
    origin:'http://127.0.0.1:5173'
}

const app = express();

app.use(cors(corsOptions));
app.use(express.json()); 
app.use(express.urlencoded({extended: true}));

app.get('/', (req,res)=>{
    res.json({
        message: 'ok',
    });
});

require('./routes/event.route')(app);


const port = 4000;
app.listen(port, ()=>{
    console.log(`Server is running http://localhost:${port}`);
});