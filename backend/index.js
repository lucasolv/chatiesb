require("dotenv").config()
const express = require("express")
const path = require("path")
const cors = require("cors")
const UserRoutes = require('./routes/UserRoutes')
const AskRoutes = require('./routes/AskRoutes')

const port = process.env.PORT

const app = express()

//Config JSON and form data response
app.use(express.json())
app.use(express.urlencoded({extended: false}))

//Solve CORS
app.use(cors({credentials: true, origin: `http://localhost:3000`}))

//Public folder for images
app.use(express.static('public'))

//Routes
app.use('/users', UserRoutes)
app.use('/ask', AskRoutes)

app.listen(port, ()=>{
    console.log(`App rodando na porta ${port}`)
})