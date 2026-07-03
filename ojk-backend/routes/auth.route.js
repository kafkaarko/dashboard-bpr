const  login  = require('../controller/auth.controller')
const express = require('express')

 const authRoute = express.Router()

authRoute.post('/login', login )

module.exports = authRoute