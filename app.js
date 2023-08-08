const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// GET All User List API

app.get("/users/", async (request, response) => {
  const getUserQuery = `SELECT * FROM user`;
  const userResponse = await db.all(getUserQuery);
  response.send(userResponse);
});

// POST Register API
app.post("/register", async (request, response) => {
  let { username, name, password, gender, location } = request.body; //Destructuring the data from the API call

  let hashedPassword = await bcrypt.hash(password, 10); //Hashing the given password

  let checkTheUsername = `
                SELECT *
                FROM user
                WHERE username = '${username}';`;
  let userData = await db.get(checkTheUsername); //Getting the user details from the database
  if (userData === undefined) {
    //checks the condition if user is already registered or not in the database
    /*If userData is not present in the database then this condition executes*/
    let postNewUserQuery = `
                INSERT INTO
                user (username,name,password,gender,location)
                VALUES (
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}'
                );`;
    if (password.length < 5) {
      //checking the length of the password
      response.status(400);
      response.send("Password is too short");
    } else {
      /*If password length is greater than 5 then this block will execute*/

      let newUserDetails = await db.run(postNewUserQuery); //Updating data to the database
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    /*If the userData is already registered in the database then this block will execute*/
    response.status(400);
    response.send("User already exists");
  }
});

// POST Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// PUT Change Password API

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkForUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(checkForUserQuery);
  //First we have to know whether the user exists in the database or not.
  if (dbUser === undefined) {
    // user not resgistered
    response.status = 400;
    response.send("User not resgistered");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      // check length of new password
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        // password is too short
        response.status(400);
        response.send("Password is too short");
      } else {
        // update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `UPDATE user SET password = '${encryptedPassword}' WHERE username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      //invalid password
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
// DELETE user API

app.delete("/user/:username/", async (request, response) => {
  const { username } = request.params;
  //console.log(username);
  const deleteQuery = `DELETE FROM user WHERE username = '${username}'`;
  const deleteQueryResponse = await db.run(deleteQuery);
  response.send("Deleted Successfully");
});

module.exports = app;
