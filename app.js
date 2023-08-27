const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbpath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;
const initializedb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`Db error is ${e.message}`);
  }
};

initializedb();

//LOGIN API

const authentication = (request, response, next) => {
  const authoHeader = request.headers["authorization"];
  const jwtToken = authoHeader.split(" ")[1];
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "ramshnayak", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getuser = `
     select * from user where username='${username}';
  `;
  const user = await db.get(getuser);
  if (user === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispasswordcorrect = await bcrypt.compare(password, user.password);
    if (ispasswordcorrect === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "ramshnayak");
      response.send({ jwtToken });
    }
  }
});

const formate = (item) => {
  return {
    stateId: item.state_id,
    stateName: item.state_name,
    population: item.population,
  };
};

// GET states API
app.get("/states/", authentication, async (request, response) => {
  const getstatequiery = `
     select * from State;
  `;
  const answerArray = await db.all(getstatequiery);
  const formatted = answerArray.map((each) => formate(each));
  response.send(formatted);
  console.log(formatted);
});

//GET STATE
app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const getstate = `
     select * from state where state_id=${stateId};
  `;
  const state = await db.get(getstate);
  const formattedstate = formate(state);
  response.send(formattedstate);
  console.log(formattedstate);
});

// Create District  API

app.post("/districts/", authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  console.log(deaths, districtName, stateId);
  const addquary = `
  insert into district (district_name,state_id,cases,cured,active,deaths)
  values('${districtName}',${stateId},${cases},${cured},${active},${deaths});
  `;
  const dbdistrict = await db.run(addquary);
  response.send("District Successful");
  console.log("District Successful");
});

// GET DISTRICT

const formatdistrict = (item) => {
  return {
    districtId: item.district_id,
    districtName: item.district_name,
    stateId: item.state_id,
    cases: item.cases,
    cured: item.cured,
    active: item.active,
    deaths: item.deaths,
  };
};

app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistquery = `
      select * from district where district_id=${districtId};
    `;
    const district = await db.get(getDistquery);
    const fdistrict = formatdistrict(district);
    response.send(fdistrict);
    console.log(fdistrict);
  }
);

// DELETE District

app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const deltebookquery = `
      delete from district where district_id=${districtId};
  `;
    const ans = await db.run(deltebookquery);
    response.send("District Re");
  }
);

//UPDATE API

app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updatequery = `
    UPDATE district SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths};                 
  `;
    const newdist = await db.run(updatequery);
    response.send("District Details ");
    console.log("District Details ");
  }
);

//STATS

app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const statsquery = `
      select sum(cases) as ca,sum(cured) as cu,sum(active) as ac,sum(deaths) as dh 
       from district where state_id=${stateId};
  `;
    const stats = await db.get(statsquery);
    const finalResult = {
      totalCases: stats.ca,
      totalCured: stats.cu,
      totalActive: stats.ac,
      totalDeaths: stats.dh,
    };
    response.send(finalResult);
    console.log(finalResult);
  }
);

module.exports = app;
