DROP TABLE IF EXISTS todos, users;

CREATE TABLE todo_users(
id SERIAL PRIMARY KEY,
name VARCHAR(100) UNIQUE NOT NULL,
color VARCHAR(15)
);

CREATE TABLE todos(
id SERIAL PRIMARY KEY,
title CHAR(100) NOT NULL,
user_id INTEGER REFERENCES users(id)
);

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS todo_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color varchar(15)
    );
`;