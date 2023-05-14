/*------------------------------------
ExpressConfig
--------------------------------------*/
const express = require("express");
const app = express();

/*------------------------------------
dotenv
--------------------------------------*/
require("dotenv").config();

/*------------------------------------
Firebase Config
--------------------------------------*/
//const key = require("./key.json");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp({
  credential: cert(process.env),
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

//--------------------jwt-------------------------------
const jwt = require("jsonwebtoken");
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_TOKEN, {
    expiresIn: maxAge,
  });
};

//--------------------nodemailer-------------------------------
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587 || 465,
  secure: false,
  auth: {
    user: process.env.email,
    pass: process.env.password,
  },
});

//--------------------twilio-------------------------------
/*const twilioAccountSid = process.env.twilioAccountSid;
const twilioAuthToken = process.env.twilioAuthToken;
const client = require("twilio")(twilioAccountSid, twilioAuthToken);*/

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
  res.sendFile(staticPath + "/page/signup.html");
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
  res.sendFile(staticPath + "/page/signin.html");
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

//----------------------Profile section----------------------------
//render profile section
app.get("/profile", requireAuth, async (req, res) => {
  try {
    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    const dietDocRef = db.collection("dietPlan").doc(ID);
    const dietResponse = await dietDocRef.get();
    const dietData = dietResponse.data();

    const workoutDocRef = db.collection("workoutPlan").doc(ID);
    const workoutResponse = await workoutDocRef.get();
    const workoutData = workoutResponse.data();

    res.render(templatePath + "/profile.hbs", {
      dietData: dietData,
      workoutData: workoutData,
    });
  } catch (error) {
    res.status(400).json({ error: errorHandler.handleErrors(error) });
  }
});

//delete diet plan
app.post("/deleteDietPlan", requireAuth, async (req, res) => {
  try {
    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    const response = await db.collection("dietPlan").doc(ID).delete();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: errorHandler.handleErrors(error) });
  }
});

//delete workout plan
app.post("/deleteWorkoutPlan", requireAuth, async (req, res) => {
  try {
    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    const response = await db.collection("workoutPlan").doc(ID).delete();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: errorHandler.handleErrors(error) });
  }
});

//add phone number
app.post("/addPhoneNumber", requireAuth, async (req, res) => {
  try {
    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    const phoneNumnerJson = {
      number: req.body.number,
    };
    const response = await db
      .collection("phoneNumber")
      .doc(ID)
      .set(phoneNumnerJson);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: errorHandler.handleErrors(error) });
  }
});

//----------------------Workout recommendation----------------------------
//workout
app.get("/workout", requireAuth, async (req, res) => {
  res.sendFile(staticPath + "/page/workout.html");
});

//get muscles
app.get("/getMuscles", requireAuth, async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: process.env.x_rapidapi_url + "muscles/",
      headers: {
        "x-rapidapi-key": process.env.x_rapidapi_key,
        "x-rapidapi-host": process.env.x_rapidapi_host,
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
app.get("/exerciseByName/:id", requireAuth, async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: key["x-rapidapi-url"],
      params: { name: req.params.id },
      headers: {
        "x-rapidapi-key": process.env.x_rapidapi_key,
        "x-rapidapi-host": process.env.x_rapidapi_host,
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
app.get("/exerciseByPrimaryMuscle/:id", requireAuth, async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: process.env.x_rapidapi_url,
      params: { primaryMuscle: req.params.id },
      headers: {
        "x-rapidapi-key": process.env.x_rapidapi_key,
        "x-rapidapi-host": process.env.x_rapidapi_host,
      },
    };
    const response = await axios.request(options);
    const data = response.data;

    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    if (data.length != 0)
      await db.collection("workoutPlan").doc(ID).set({ data });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

//get exercise by Secondry muscles
app.get("/exerciseBySecondryMuscle/:id", requireAuth, async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: process.env.x_rapidapi_url,
      params: { secondaryMuscle: req.params.id },
      headers: {
        "x-rapidapi-key": process.env.x_rapidapi_key,
        "x-rapidapi-host": process.env.x_rapidapi_host,
      },
    };
    const response = await axios.request(options);
    const data = response.data;

    //save data to database
    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    if (data.length != 0)
      await db.collection("workoutPlan").doc(ID).set({ data });

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
      apiKey: process.env.diet_api_key,
      ...params,
    },
  });
  return response.data;
}

//diet
app.get("/diet", requireAuth, async (req, res) => {
  res.sendFile(staticPath + "/page/diet.html");
});

//generate meal plan
app.post("/generate-meal-plan", requireAuth, async (req, res) => {
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

    //save data to database
    const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    if (mealPlan.length != 0)
      await db.collection("dietPlan").doc(ID).set(mealPlan);

    res.json(mealPlan);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while generating the meal plan.");
  }
});

/*---------------------------------
IOT
------------------------------------*/
let sensorData = null;

//data fetching from iot sensor
app.post("/data", async (req, res) => {
  const data = {
    temperature: req.body.temperature,
    humidity: req.body.humidity,
    gas: req.body.gas,
  };

  // Store the data in the global variable
  sensorData = data;

  console.log(
    `Temperature: ${req.body.temperature} °C | Humidity: ${req.body.humidity} % | Gas: ${req.body.gas} ppm`
  );
});

//threshold value
const thresholdTemperature = 40;
const thresholdHumidity = 50;
const thresholdGas = 22.5;

//sending iot device data to frontend
app.get("/iotdata", requireAuth, (req, res) => {
  // Check if sensorData has been populated
  if (!sensorData) {
    res.send({ error: "Sensor data not available" });
    return;
  }

  // Compare current values and gas with threshold values
  if (
    sensorData.temperature > thresholdTemperature ||
    sensorData.humidity > thresholdHumidity ||
    sensorData.gas > thresholdGas
  ) {
    const rEmail = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
    sendAlert(
      sensorData.temperature,
      sensorData.humidity,
      sensorData.gas,
      rEmail
    );
  }
  // Return the sensorData in JSON format
  res.json(sensorData);
});

//let rPhoneNumber = "";
//getting food detect page
app.get("/foodDetect", requireAuth, async (req, res) => {
  /*const ID = jwt.verify(req.cookies.jwt, process.env.JWT_TOKEN).id;
  await db
    .collection("phoneNumber")
    .doc(ID)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const data = doc.data();
        rPhoneNumber = data.number;
      } else {
        console.log("No such document!");
      }
    })
    .catch((error) => {
      console.log("Error getting document:", error);
    });*/
  res.sendFile(staticPath + "/page/foodDetect.html");
});

//global values
//let isEmailSent = false;
let lastEmailSent = 0;

function sendAlert(temperature, humidity, gas, rEmail) {
  // Check if an email has already been sent within the past hour
  const now = Date.now();
  if (now - lastEmailSent > 3600000) {
    // Update lastEmailSent time
    lastEmailSent = now;

    // Update email message with current temperature values
    const mailOptions = {
      from: "Alert@HealthIQ.com",
      to: rEmail,
      subject: "Food Spoilage Detected",
      text: `Temperature has exceeded the threshold value of ${thresholdTemperature}°C. The current temperature is ${temperature}°C.\nHumidity has exceeded the threshold value of ${thresholdHumidity}%. The current Humidity is ${humidity}%.\nMethane Gas has exceeded the threshold value of ${thresholdGas}ppm. The current Methane Gas is ${gas}ppm.`,
    };

    //send sms
    /*if (rPhoneNumber != "") {
      rPhoneNumber = "+917240974211";
      sendAlertSMS(temperature, humidity, gas, rPhoneNumber);
    }*/

    // Send email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }
}

// Send SMS alert
/*function sendAlertSMS(temperature, humidity, gas, rPhoneNumber) {
  client.messages
    .create({
      body: `Temperature has exceeded the threshold value of ${thresholdTemperature}°C. The current temperature is ${temperature}°C.\nHumidity has exceeded the threshold value of ${thresholdHumidity}%. The current Humidity is ${humidity}%.\nMethane Gas has exceeded the threshold value of ${thresholdGas}ppm. The current Methane Gas is ${gas}ppm.`,
      from: key.twilioPhoneNumber,
      to: rPhoneNumber,
    })
    .then((message) => console.log(message.sid))
    .catch((error) => console.log(error));
}*/

/*---------------------------------
app listen
------------------------------------*/
app.listen(PORT, () => {
  console.log(`Server is running on PORT http://localhost:${PORT}`);
});
