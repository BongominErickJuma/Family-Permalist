import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS todo_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color varchar(15)
    );
`;

const createTaskTable = `
CREATE TABLE IF NOT EXISTS todos(
  id SERIAL PRIMARY KEY,
  title CHAR(255) NOT NULL,
  user_id INTEGER REFERENCES todo_users(id)
  );
`;

db.query(createUsersTable, (err) => {
  if (err) {
    console.error("Error creating users table:", err);
  } else {
    console.log("Users table created successfully!");
  }
});

db.query(createTaskTable, (err) => {
  if (err) {
    console.error("Error creating Task table:", err);
  } else {
    console.log("Task table created successfully!");
  }
});

let currentUserId;

let users = [];

db.query("SELECT * FROM todo_users", (err, res) => {
  if (err) {
    console.error("trouble querying data", err.stack);
  } else {
    if (res.rows.length !== 0) {
      users = res.rows;
      const id = res.rows[0].id;
      currentUserId = id;
    }
  }
});

async function checkTodos() {
  const result = await db.query(
    "SELECT t.id, t.title FROM todos t JOIN todo_users u ON u.id = t.user_id WHERE user_id = $1 ORDER BY t.id ASC",
    [currentUserId]
  );
  const items = result.rows;
  return items;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM todo_users");
  users = result.rows;

  const user = users.find((user) => user.id == currentUserId);

  if (user) {
    return users.find((user) => user.id == currentUserId);
  } else {
    currentUserId = result.rows[0].id;
    return users.find((user) => user.id == currentUserId);
  }
}

function capitalizeFirstLetter(string) {
  const capitalized =
    string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  return capitalized;
}

// retreive

app.get("/", async (req, res) => {
  try {
    const items = await checkTodos();
    const currentUser = await getCurrentUser();

    if (users.length !== 0) {
      res.render("index.ejs", {
        listTitle: currentUser.name,
        listItems: items,
        users: users,
        color: currentUser.color,
      });
    } else {
      res.render("show.ejs");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/new", (req, res) => {
  res.render("new.ejs");
});

app.post("/add", async (req, res) => {
  const input = req.body.newItem;
  const currentUser = await getCurrentUser();
  try {
    await db.query("INSERT INTO todos (title, user_id) VALUES ($1, $2)", [
      input,
      currentUser.id,
    ]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// update
app.post("/edit", async (req, res) => {
  let id = req.body.updatedItemId;
  let title = req.body.updatedItemTitle;

  try {
    await db.query("UPDATE todos SET title = ($1) WHERE id = ($2)", [
      title,
      id,
    ]);
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

// delete

app.post("/delete", async (req, res) => {
  let id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM todos WHERE id = $1", [id]);
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});
app.post("/new", async (req, res) => {
  let name = req.body.name.trim();
  const color = req.body.color;

  try {
    name = capitalizeFirstLetter(name);
    if (name === "" || name.length > 100) {
      res.redirect("/");
    } else {
      const resultCheck = await db.query(
        "SELECT name FROM todo_users WHERE name = $1",
        [name]
      );

      if (resultCheck.rows.length !== 0) {
        res.redirect("/");
      } else {
        const result = await db.query(
          "INSERT INTO todo_users (name, color) VALUES($1, $2) RETURNING *;",
          [name, color]
        );

        const id = result.rows[0].id;
        currentUserId = id;

        res.redirect("/");
      }
    }
  } catch (error) {
    console.log(error);
  }
});
app.post("/remove", async (req, res) => {
  try {
    const currentUser = await getCurrentUser();

    await db.query(
      "DELETE FROM todos WHERE user_id = (SELECT id FROM todo_users WHERE name = $1)",
      [currentUser.name]
    );
    await db.query("DELETE FROM todo_users WHERE name = $1;", [
      currentUser.name,
    ]);

    const result = await db.query("SELECT * FROM todo_users");

    if (result.rows.length !== 0) {
      const id = result.rows[0].id;
      currentUserId = id;
      res.redirect("/");
    } else {
      res.render("show.ejs");
    }
  } catch (error) {
    console.log(error);
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
