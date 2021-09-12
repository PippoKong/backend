/////////////////////////
////////   SETUP ////////
////////////////////////

// initialise dontenv and gets port from it
require('dotenv').config()
const PORT = process.env.SERVER_PORT

// loads filesystem
const fs = require('fs')

// loads CORS
const cors = require('cors')

// loads and initialise express
const express = require('express')
const app = express()

// loads bcrypt
const bcrypt = require('bcrypt')

// allows specified url to send http-requests
app.use(
  cors({
    origin: 'http://localhost:8080',
  })
)

// enabels express app to work with JSON
app.use(express.json())

/////////////////////////
////////   ROUTES ///////
////////////////////////

app.get('/login', async (req, res) => {
  // gets users as JS-Object
  const users = JSON.parse(fs.readFileSync('./users/users.json'))

  // saves user input
  const email = req.query.email
  const password = req.query.password

  // tries to get a user with specified email
  const user = users.find((user) => user.email == email)

  if (!user) {
    // No User with this E-Mail
    console.log('Failed to login: No user with specified E-Mail (' + email + ')')
    return res.send('UNKNOWN_EMAIL')
  }

  if (!(await bcrypt.compare(password, user.password))) {
    // Wrong Password
    console.log('Failed to login: Wrong password (' + password + ')')
    return res.send('WRONG_PASSWORD')
  }

  // send User ID
  console.log('Successful login: User ' + user.id)
  return res.send(user.id.toString())
})

app.post('/register', async (req, res) => {
  // gets users as JS-Object
  const users = JSON.parse(fs.readFileSync('./users/users.json'))

  // creates new possible user based on user input
  const newUser = {
    id: users.length,
    email: req.body.email,
    name: req.body.name,
    password: await bcrypt.hash(req.body.password, 10),
  }

  if (!!users.find((user) => user.email == newUser.email)) {
    // E-Mail already used
    console.log('Failed to register: E-Mail already used(' + newUser.email + ')')
    return res.send('EMAIL_ALREADY_USED')
  }

  // adds User Information to users.json
  users.push(newUser)
  fs.writeFile('./users/users.json', JSON.stringify(users), () =>
    console.log('Successful registration: User with ID ' + newUser.id + ' added to users.json')
  )

  // creates User Data File
  const defaultUserData = JSON.parse(fs.readFileSync('./users/userdata/user_default.json'))
  const newUserFile = {
    name: newUser.name,
    ...defaultUserData,
  }
  fs.writeFile('./users/userdata/user_' + newUser.id + '.json', JSON.stringify(newUserFile), () =>
    console.log('added new User File for User with ID ' + newUser.id)
  )

  return res.sendStatus(200)
})

app.get('/user', (req, res) => {
  // sends userdata for user with specified ID
  const userId = req.query.userId
  console.log('sent User File for User with ID ' + userId)
  res.sendFile(__dirname + '/users/userdata/user_' + userId + '.json')
})

app.post('/updateAccounts', (req, res) => {
  // updates accounts list for certain user
  const userId = req.body.userId
  const newUserAccounts = req.body.newUserAccounts
  const currentUserData = JSON.parse(fs.readFileSync('./users/userdata/user_' + userId + '.json'))
  let newUserData = currentUserData
  newUserData.accounts = newUserAccounts
  fs.writeFile('./users/userdata/user_' + userId + '.json', JSON.stringify(newUserData), () =>
    console.log('changed Account List for User with ID ' + userId)
  )
  res.sendStatus(200)
})

app.post('/resetAccounts', (req, res) => {
  // resets accounts list for certain user
  const userId = req.body.userId
  const currentUserData = JSON.parse(fs.readFileSync('./users/userdata/user_' + userId + '.json'))
  const defaultAccounts = JSON.parse(fs.readFileSync('./users/userdata/user_default.json')).accounts
  let newUserData = currentUserData
  newUserData.accounts = defaultAccounts
  fs.writeFile('./users/userdata/user_' + userId + '.json', JSON.stringify(newUserData), () =>
    console.log('reseted Account List for User with ID ' + userId)
  )
  res.sendStatus(200)
})

app.post('/updateRecords', (req, res) => {
  // updates levels of records
  const userId = req.body.userId
  const inputRecords = req.body.records

  const currentUserData = JSON.parse(fs.readFileSync('./users/userdata/user_' + userId + '.json'))
  const currentTopics = currentUserData.topics
  let newTopics = currentTopics

  inputRecords.forEach((inputRecord) => {
    const currentId = inputRecord.recordId
    const currentRecordCorrect = inputRecord.correct
    newTopics.forEach((topic) => {
      topic.records.forEach((record) => {
        if (record.id === currentId) {
          if (currentRecordCorrect) {
            record.level--
            if (record.level < 1) record.level = 1
          } else {
            record.level++
            if (record.level > 5) record.level = 5
          }
        }
      })
    })
  })

  let newUserData = currentUserData
  newUserData.topics = newTopics

  fs.writeFile('./users/userdata/user_' + userId + '.json', JSON.stringify(newUserData), () =>
    console.log('updated Levels for User with ID ' + userId)
  )

  res.sendStatus(200)
})

/////////////////////////
////////   START ////////
////////////////////////
app.listen(PORT, () => console.log('Server running on ' + PORT))
