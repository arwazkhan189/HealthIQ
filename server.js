/*------------------------------------
Express Config
--------------------------------------*/
const express = require("express");
const app = express();

/*------------------------------------
Firebase Config
--------------------------------------*/
const key = require("./key.json");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp({
  credential: cert(key),
});
const db = getFirestore();

/*--------------------------------------------
External Functions
----------------------------------------------*/
const { addUser, authenticate, signout } = require("./src/user_service");
const errorHandler = require("./src/errorhandler");
const { requireAuth, checkUser } = require("./src/authMiddleware");

/*--------------------------------------
MiddleWares
----------------------------------------*/
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 3000;
const axios = require("axios");

//-----------paths---------------------------
const path = require("path");
const staticPath = path.join(__dirname, "/public");
const templatePath = path.join(__dirname, "/templates");

//--------use & sets-------------------------------
app.set("view engine", "hbs");
app.set("views", templatePath);
app.use(express.static(staticPath));
//app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

//--------------------jwt-------------------------------
const jwt = require("jsonwebtoken");
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, "healthiq", {
    expiresIn: maxAge,
  });
};

/*-------------------------------------------
Endpoints
--------------------------------------------*/
//checkuser
//app.get("*", checkUser);

//*-----------------------Home---------------------------------
app.get("/", async (req, res) => {
  res.sendFile(staticPath + "/index.html");
});

//----------------------Authentication----------------------------
//signup (get)
app.get("/signup", async (req, res) => {
  res.sendFile(staticPath + "/signup.html");
});

//signup (post)- create account
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResponse = await addUser(email, password);
    const token = createToken(email);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json(userResponse.user);
  } catch (error) {
    res.status(400).json({ error: errorHandler.handleErrors(error) });
  }
});

//signin (get)
app.get("/signin", async (req, res) => {
  res.sendFile(staticPath + "/signin.html");
});

//signin (post) - to account
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResponse = await authenticate(email, password);
    const token = createToken(userResponse.user.email);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json(userResponse.user);
  } catch (error) {
    res.status(400).json({ error: errorHandler.handleErrors(error) });
  }
});

//signout (get)
app.get("/signout", requireAuth, async (req, res) => {
  await signout
    .then(() => {
      res.cookie("jwt", "", { maxAge: 1 });
      res.status(200).send("OK");
    })
    .catch((error) => {
      res.status(400).json({ error: errorHandler.handleErrors(error) });
    });
});

//----------------------Workout recommendation----------------------------
//workout
app.get("/workout", async (req, res) => {
  res.sendFile(staticPath + "/workout.html");
});

//get muscles
app.get("/getMuscles", async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: key["x-rapidapi-url"] + "muscles/",
      headers: {
        "x-rapidapi-key": key["x-rapidapi-key"],
        "x-rapidapi-host": key["x-rapidapi-host"],
      },
    };
    const response = await axios.request(options);
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

//get exercise by name
app.get("/exerciseByName/:id", async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: key["x-rapidapi-url"],
      params: { name: req.params.id },
      headers: {
        "x-rapidapi-key": key["x-rapidapi-key"],
        "x-rapidapi-host": key["x-rapidapi-host"],
      },
    };
    const response = await axios.request(options);
    const data = response.data;
    res.json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

//get exercise by primary muscles
app.get("/exerciseByPrimaryMuscle/:id", async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: key["x-rapidapi-url"],
      params: { primaryMuscle: req.params.id },
      headers: {
        "x-rapidapi-key": key["x-rapidapi-key"],
        "x-rapidapi-host": key["x-rapidapi-host"],
      },
    };
    const response = await axios.request(options);
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

//get exercise by Secondry muscles
app.get("/exerciseBySecondryMuscle/:id", async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: key["x-rapidapi-url"],
      params: { secondaryMuscle: req.params.id },
      headers: {
        "x-rapidapi-key": key["x-rapidapi-key"],
        "x-rapidapi-host": key["x-rapidapi-host"],
      },
    };
    const response = await axios.request(options);
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

//----------------------Diet recommendation----------------------------
// Function to make API requests to the Spoonacular API
async function makeRequest(endpoint, params) {
  const response = await axios.get(`https://api.spoonacular.com${endpoint}`, {
    params: {
      apiKey: key.diet_api_key,
      ...params,
    },
  });
  return response.data;
}

//diet
app.get("/diet", async (req, res) => {
  res.sendFile(staticPath + "/diet.html");
});

//generate meal plan
app.post("/generate-meal-plan", async (req, res) => {
  try {
    const { diet, calories, timeFrame, ingredients } = req.body;
    const exclude = ingredients
      ? ingredients
          .split(",")
          .map((i) => i.trim())
          .join(",")
      : undefined;
    const mealPlan = await makeRequest("/mealplanner/generate", {
      diet,
      targetCalories: calories,
      timeFrame,
      exclude,
    });

    res.json(mealPlan);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while generating the meal plan.");
  }
});

/*---------------------------------
IOT
------------------------------------*/
//data fetching from iot sensor
app.post("/data", async (req, res) => {
  const data = {
    temperature: req.body.temperature,
    humidity: req.body.humidity,
    gas: req.body.gas,
  };

  //add data to firestore
  //const iotData = `${jwt.verify(req.cookies.jwt, "healthiq").id}`;
  //const dbResponse = await db.collection("iotData").doc(iotData).set(data);
  //console.log(dbResponse);
  console.log(
    `Temperature: ${req.body.temperature} °C | Humidity: ${req.body.humidity} % | Gas: ${req.body.gas} ppm`
  );
  /*console.log(
    `Temperature: ${req.body.temperature} °C | Humidity: ${req.body.humidity} %`
  );*/

  res.json(data);
});

//food detect
app.get("/foodDetect", async (req, res) => {
  res.sendFile(staticPath + "/foodDetect.html");
});

//sending iot device data to frontend

/*---------------------------------
app listen
------------------------------------*/
app.listen(PORT, () => {
  console.log(`Server is running on PORT http://localhost:${PORT}`);
});
