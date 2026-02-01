import { ProjectTemplate } from '../types';

export const TEMPLATES: ProjectTemplate[] = [
  // ==================== PYTHON ====================
  {
    id: 'python-basic',
    name: 'Python',
    description: 'Basic Python starter file',
    icon: '🐍',
    category: 'backend',
    files: {
      'main.py': `# Python Basic Starter
# Run: python main.py

def main():
    print("Hello, Python! 🐍")
    
    # Variables
    name = "World"
    age = 25
    
    # String formatting
    print(f"Hello, {name}! You are {age} years old.")
    
    # List example
    fruits = ["apple", "banana", "cherry"]
    for fruit in fruits:
        print(f"I like {fruit}")
    
    # Dictionary example
    person = {
        "name": "John",
        "age": 30,
        "city": "New York"
    }
    print(f"Person: {person}")

if __name__ == "__main__":
    main()
`,
      'README.md': `# Python Project

## Getting Started

\`\`\`bash
python main.py
\`\`\`

## Requirements
- Python 3.8+
`,
    },
  },

  // ==================== JAVASCRIPT ====================
  {
    id: 'javascript-basic',
    name: 'JavaScript',
    description: 'Basic JavaScript starter file',
    icon: '💛',
    category: 'frontend',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JavaScript Starter</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #1a1a2e;
      color: #eee;
    }
    .output {
      background: #16213e;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>JavaScript Starter 💛</h1>
  <div class="output" id="output"></div>
  <script src="script.js"></script>
</body>
</html>`,
      'script.js': `// JavaScript Basic Starter
console.log("Hello, JavaScript! 💛");

// Variables
const name = "World";
let count = 0;

// Function
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Array
const fruits = ["apple", "banana", "cherry"];
fruits.forEach(fruit => {
  console.log(\`I like \${fruit}\`);
});

// Object
const person = {
  name: "John",
  age: 30,
  greet() {
    return \`Hi, I'm \${this.name}\`;
  }
};

// DOM manipulation
const output = document.getElementById("output");
output.innerHTML = \`
  <p>\${greet(name)}</p>
  <p>Fruits: \${fruits.join(", ")}</p>
  <p>\${person.greet()}</p>
\`;

console.log("Check the browser console for more output!");
`,
    },
  },

  // ==================== TYPESCRIPT ====================
  {
    id: 'typescript-basic',
    name: 'TypeScript',
    description: 'Basic TypeScript starter file',
    icon: '💙',
    category: 'frontend',
    files: {
      'index.ts': `// TypeScript Basic Starter
console.log("Hello, TypeScript! 💙");

// Type annotations
const name: string = "World";
const age: number = 25;
const isActive: boolean = true;

// Interface
interface Person {
  name: string;
  age: number;
  email?: string; // optional
}

// Function with types
function greet(person: Person): string {
  return \`Hello, \${person.name}! You are \${person.age} years old.\`;
}

// Array with type
const fruits: string[] = ["apple", "banana", "cherry"];

// Object
const user: Person = {
  name: "John",
  age: 30,
};

// Generic function
function identity<T>(arg: T): T {
  return arg;
}

// Class
class Animal {
  constructor(public name: string) {}
  
  speak(): void {
    console.log(\`\${this.name} makes a sound.\`);
  }
}

// Usage
console.log(greet(user));
console.log(identity<number>(42));

const dog = new Animal("Dog");
dog.speak();
`,
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["*.ts"]
}`,
      'README.md': `# TypeScript Project

## Getting Started

\`\`\`bash
# Install TypeScript
npm install -g typescript

# Compile
tsc

# Run
node dist/index.js
\`\`\`
`,
    },
  },

  // ==================== HTML/CSS ====================
  {
    id: 'html-css-basic',
    name: 'HTML + CSS',
    description: 'Basic HTML and CSS starter',
    icon: '🌐',
    category: 'static',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML + CSS Starter</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav>
      <h1>🌐 My Website</h1>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h2>Welcome to My Website</h2>
      <p>This is a basic HTML + CSS starter template.</p>
      <button>Get Started</button>
    </section>

    <section class="features">
      <div class="card">
        <h3>Feature 1</h3>
        <p>Description of feature 1</p>
      </div>
      <div class="card">
        <h3>Feature 2</h3>
        <p>Description of feature 2</p>
      </div>
      <div class="card">
        <h3>Feature 3</h3>
        <p>Description of feature 3</p>
      </div>
    </section>
  </main>

  <footer>
    <p>&copy; 2024 My Website. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* CSS Basic Starter */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
}

/* Navigation */
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #2c3e50;
  color: white;
}

nav ul {
  display: flex;
  list-style: none;
  gap: 2rem;
}

nav a {
  color: white;
  text-decoration: none;
}

nav a:hover {
  color: #3498db;
}

/* Hero Section */
.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.hero button {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 1rem;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Footer */
footer {
  text-align: center;
  padding: 2rem;
  background: #2c3e50;
  color: white;
}
`,
    },
  },

  // ==================== JAVA ====================
  {
    id: 'java-basic',
    name: 'Java',
    description: 'Basic Java starter file',
    icon: '☕',
    category: 'backend',
    files: {
      'Main.java': `// Java Basic Starter
// Compile: javac Main.java
// Run: java Main

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java! ☕");
        
        // Variables
        String name = "World";
        int age = 25;
        double price = 19.99;
        boolean isActive = true;
        
        // String formatting
        System.out.printf("Hello, %s! You are %d years old.%n", name, age);
        
        // Array
        String[] fruits = {"apple", "banana", "cherry"};
        for (String fruit : fruits) {
            System.out.println("I like " + fruit);
        }
        
        // Class usage
        Person person = new Person("John", 30);
        person.greet();
    }
}

class Person {
    private String name;
    private int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public void greet() {
        System.out.println("Hi, I'm " + name + " and I'm " + age + " years old.");
    }
}
`,
      'README.md': `# Java Project

## Getting Started

\`\`\`bash
javac Main.java
java Main
\`\`\`
`,
    },
  },

  // ==================== C++ ====================
  {
    id: 'cpp-basic',
    name: 'C++',
    description: 'Basic C++ starter file',
    icon: '⚡',
    category: 'backend',
    files: {
      'main.cpp': `// C++ Basic Starter
// Compile: g++ -o main main.cpp
// Run: ./main

#include <iostream>
#include <string>
#include <vector>

using namespace std;

// Function declaration
void greet(const string& name);

// Class
class Person {
private:
    string name;
    int age;
    
public:
    Person(string n, int a) : name(n), age(a) {}
    
    void introduce() {
        cout << "Hi, I'm " << name << " and I'm " << age << " years old." << endl;
    }
};

int main() {
    cout << "Hello, C++! ⚡" << endl;
    
    // Variables
    string name = "World";
    int age = 25;
    double price = 19.99;
    
    // Function call
    greet(name);
    
    // Vector (dynamic array)
    vector<string> fruits = {"apple", "banana", "cherry"};
    for (const auto& fruit : fruits) {
        cout << "I like " << fruit << endl;
    }
    
    // Class usage
    Person person("John", 30);
    person.introduce();
    
    return 0;
}

void greet(const string& name) {
    cout << "Hello, " << name << "!" << endl;
}
`,
      'README.md': `# C++ Project

## Getting Started

\`\`\`bash
g++ -o main main.cpp
./main
\`\`\`
`,
    },
  },

  // ==================== C ====================
  {
    id: 'c-basic',
    name: 'C',
    description: 'Basic C starter file',
    icon: '🔧',
    category: 'backend',
    files: {
      'main.c': `// C Basic Starter
// Compile: gcc -o main main.c
// Run: ./main

#include <stdio.h>
#include <string.h>

// Function declaration
void greet(const char* name);

// Struct
struct Person {
    char name[50];
    int age;
};

int main() {
    printf("Hello, C! 🔧\\n");
    
    // Variables
    char name[] = "World";
    int age = 25;
    float price = 19.99;
    
    // Function call
    greet(name);
    
    // Array
    char* fruits[] = {"apple", "banana", "cherry"};
    int numFruits = 3;
    
    for (int i = 0; i < numFruits; i++) {
        printf("I like %s\\n", fruits[i]);
    }
    
    // Struct usage
    struct Person person;
    strcpy(person.name, "John");
    person.age = 30;
    
    printf("Hi, I'm %s and I'm %d years old.\\n", person.name, person.age);
    
    return 0;
}

void greet(const char* name) {
    printf("Hello, %s!\\n", name);
}
`,
      'README.md': `# C Project

## Getting Started

\`\`\`bash
gcc -o main main.c
./main
\`\`\`
`,
    },
  },

  // ==================== GO ====================
  {
    id: 'go-basic',
    name: 'Go',
    description: 'Basic Go starter file',
    icon: '🐹',
    category: 'backend',
    files: {
      'main.go': `// Go Basic Starter
// Run: go run main.go

package main

import "fmt"

// Struct
type Person struct {
    Name string
    Age  int
}

// Method
func (p Person) Greet() {
    fmt.Printf("Hi, I'm %s and I'm %d years old.\\n", p.Name, p.Age)
}

// Function
func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}

func main() {
    fmt.Println("Hello, Go! 🐹")
    
    // Variables
    name := "World"
    age := 25
    
    fmt.Println(greet(name))
    fmt.Printf("Age: %d\\n", age)
    
    // Slice
    fruits := []string{"apple", "banana", "cherry"}
    for _, fruit := range fruits {
        fmt.Println("I like", fruit)
    }
    
    // Struct usage
    person := Person{Name: "John", Age: 30}
    person.Greet()
}
`,
      'go.mod': `module myproject

go 1.21
`,
      'README.md': `# Go Project

## Getting Started

\`\`\`bash
go run main.go
\`\`\`
`,
    },
  },

  // ==================== RUST ====================
  {
    id: 'rust-basic',
    name: 'Rust',
    description: 'Basic Rust starter file',
    icon: '🦀',
    category: 'backend',
    files: {
      'main.rs': `// Rust Basic Starter
// Run: rustc main.rs && ./main

fn main() {
    println!("Hello, Rust! 🦀");
    
    // Variables
    let name = "World";
    let age: i32 = 25;
    let mut count = 0;
    count += 1;
    
    println!("Hello, {}! Age: {}, Count: {}", name, age, count);
    
    // Vector
    let fruits = vec!["apple", "banana", "cherry"];
    for fruit in &fruits {
        println!("I like {}", fruit);
    }
    
    // Struct
    let person = Person {
        name: String::from("John"),
        age: 30,
    };
    person.greet();
}

struct Person {
    name: String,
    age: i32,
}

impl Person {
    fn greet(&self) {
        println!("Hi, I'm {} and I'm {} years old.", self.name, self.age);
    }
}
`,
      'README.md': `# Rust Project

## Getting Started

\`\`\`bash
rustc main.rs
./main
\`\`\`
`,
    },
  },

  // ==================== PHP ====================
  {
    id: 'php-basic',
    name: 'PHP',
    description: 'Basic PHP starter file',
    icon: '🐘',
    category: 'backend',
    files: {
      'index.php': `<?php
// PHP Basic Starter
// Run: php index.php

echo "Hello, PHP! 🐘\\n";

// Variables
$name = "World";
$age = 25;

echo "Hello, $name! You are $age years old.\\n";

// Array
$fruits = ["apple", "banana", "cherry"];
foreach ($fruits as $fruit) {
    echo "I like $fruit\\n";
}

// Function
function greet($name) {
    return "Hello, $name!";
}
echo greet("PHP Developer") . "\\n";

// Class
class Person {
    public $name;
    public $age;
    
    public function __construct($name, $age) {
        $this->name = $name;
        $this->age = $age;
    }
    
    public function introduce() {
        echo "Hi, I'm {$this->name} and I'm {$this->age} years old.\\n";
    }
}

$john = new Person("John", 30);
$john->introduce();
?>
`,
      'README.md': `# PHP Project

## Getting Started

\`\`\`bash
php index.php
\`\`\`
`,
    },
  },

  // ==================== RUBY ====================
  {
    id: 'ruby-basic',
    name: 'Ruby',
    description: 'Basic Ruby starter file',
    icon: '💎',
    category: 'backend',
    files: {
      'main.rb': `# Ruby Basic Starter
# Run: ruby main.rb

puts "Hello, Ruby! 💎"

# Variables
name = "World"
age = 25

puts "Hello, #{name}! You are #{age} years old."

# Array
fruits = ["apple", "banana", "cherry"]
fruits.each do |fruit|
  puts "I like #{fruit}"
end

# Method
def greet(name)
  "Hello, #{name}!"
end
puts greet("Ruby Developer")

# Class
class Person
  attr_accessor :name, :age
  
  def initialize(name, age)
    @name = name
    @age = age
  end
  
  def introduce
    puts "Hi, I'm #{@name} and I'm #{@age} years old."
  end
end

john = Person.new("John", 30)
john.introduce
`,
      'README.md': `# Ruby Project

## Getting Started

\`\`\`bash
ruby main.rb
\`\`\`
`,
    },
  },

  // ==================== SWIFT ====================
  {
    id: 'swift-basic',
    name: 'Swift',
    description: 'Basic Swift starter file',
    icon: '🍎',
    category: 'backend',
    files: {
      'main.swift': `// Swift Basic Starter
// Run: swift main.swift

import Foundation

print("Hello, Swift! 🍎")

// Variables
let name = "World"
var age = 25

print("Hello, \\(name)! You are \\(age) years old.")

// Array
let fruits = ["apple", "banana", "cherry"]
for fruit in fruits {
    print("I like \\(fruit)")
}

// Function
func greet(name: String) -> String {
    return "Hello, \\(name)!"
}
print(greet(name: "Swift Developer"))

// Class
class Person {
    var name: String
    var age: Int
    
    init(name: String, age: Int) {
        self.name = name
        self.age = age
    }
    
    func introduce() {
        print("Hi, I'm \\(name) and I'm \\(age) years old.")
    }
}

let john = Person(name: "John", age: 30)
john.introduce()
`,
      'README.md': `# Swift Project

## Getting Started

\`\`\`bash
swift main.swift
\`\`\`
`,
    },
  },

  // ==================== KOTLIN ====================
  {
    id: 'kotlin-basic',
    name: 'Kotlin',
    description: 'Basic Kotlin starter file',
    icon: '🎯',
    category: 'backend',
    files: {
      'Main.kt': `// Kotlin Basic Starter
// Run: kotlinc Main.kt -include-runtime -d Main.jar && java -jar Main.jar

fun main() {
    println("Hello, Kotlin! 🎯")
    
    // Variables
    val name = "World"
    var age = 25
    
    println("Hello, $name! You are $age years old.")
    
    // List
    val fruits = listOf("apple", "banana", "cherry")
    for (fruit in fruits) {
        println("I like $fruit")
    }
    
    // Function call
    println(greet("Kotlin Developer"))
    
    // Class usage
    val john = Person("John", 30)
    john.introduce()
}

fun greet(name: String): String {
    return "Hello, $name!"
}

class Person(val name: String, val age: Int) {
    fun introduce() {
        println("Hi, I'm $name and I'm $age years old.")
    }
}
`,
      'README.md': `# Kotlin Project

## Getting Started

\`\`\`bash
kotlinc Main.kt -include-runtime -d Main.jar
java -jar Main.jar
\`\`\`
`,
    },
  },

  // ==================== SQL ====================
  {
    id: 'sql-basic',
    name: 'SQL',
    description: 'Basic SQL starter file',
    icon: '🗄️',
    category: 'backend',
    files: {
      'schema.sql': `-- SQL Basic Starter

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email) VALUES
    ('john_doe', 'john@example.com'),
    ('jane_doe', 'jane@example.com');

INSERT INTO posts (user_id, title, content) VALUES
    (1, 'My First Post', 'Hello World!'),
    (2, 'Hello', 'Nice to meet you!');

-- Basic queries
SELECT * FROM users;
SELECT * FROM posts WHERE user_id = 1;

-- Join query
SELECT p.title, u.username 
FROM posts p 
JOIN users u ON p.user_id = u.id;
`,
      'README.md': `# SQL Project

## Getting Started

Use with PostgreSQL, MySQL, or SQLite.
`,
    },
  },

  // ==================== BASH ====================
  {
    id: 'bash-basic',
    name: 'Bash',
    description: 'Basic Bash shell script',
    icon: '🐚',
    category: 'backend',
    files: {
      'script.sh': `#!/bin/bash
# Bash Basic Starter
# Run: chmod +x script.sh && ./script.sh

echo "Hello, Bash! 🐚"

# Variables
NAME="World"
AGE=25

echo "Hello, $NAME! You are $AGE years old."

# Array
FRUITS=("apple" "banana" "cherry")
for fruit in "\${FRUITS[@]}"; do
    echo "I like $fruit"
done

# Function
greet() {
    echo "Hello, $1!"
}
greet "Bash Developer"

# Conditional
if [ $AGE -ge 18 ]; then
    echo "You are an adult"
fi

echo "Script completed!"
`,
      'README.md': `# Bash Project

## Getting Started

\`\`\`bash
chmod +x script.sh
./script.sh
\`\`\`
`,
    },
  },

  // ==================== REACT ====================
  {
    id: 'react-basic',
    name: 'React',
    description: 'Basic React component',
    icon: '⚛️',
    category: 'frontend',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 40px; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;

    function App() {
      const [count, setCount] = useState(0);

      return (
        <div>
          <h1>⚛️ React Starter</h1>
          <h2>Count: {count}</h2>
          <button onClick={() => setCount(c => c - 1)}>-</button>
          <button onClick={() => setCount(0)}>Reset</button>
          <button onClick={() => setCount(c => c + 1)}>+</button>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`,
      'README.md': `# React Starter

Open index.html in browser.
`,
    },
  },

  // ==================== VUE ====================
  {
    id: 'vue-basic',
    name: 'Vue.js',
    description: 'Basic Vue.js component',
    icon: '💚',
    category: 'frontend',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue.js App</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 40px; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <div id="app">
    <h1>💚 Vue.js Starter</h1>
    <h2>Count: {{ count }}</h2>
    <button @click="count--">-</button>
    <button @click="count = 0">Reset</button>
    <button @click="count++">+</button>
  </div>

  <script>
    const { createApp, ref } = Vue;

    createApp({
      setup() {
        const count = ref(0);
        return { count };
      }
    }).mount('#app');
  </script>
</body>
</html>`,
      'README.md': `# Vue.js Starter

Open index.html in browser.
`,
    },
  },

  // ==================== JSON ====================
  {
    id: 'json-basic',
    name: 'JSON',
    description: 'Basic JSON data file',
    icon: '📋',
    category: 'static',
    files: {
      'data.json': `{
  "name": "My Project",
  "version": "1.0.0",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "items": [
    { "id": 1, "name": "Item 1" },
    { "id": 2, "name": "Item 2" }
  ],
  "settings": {
    "theme": "dark",
    "language": "en"
  }
}
`,
      'README.md': `# JSON Data File

Basic JSON structure example.
`,
    },
  },

  // ==================== MARKDOWN ====================
  {
    id: 'markdown-basic',
    name: 'Markdown',
    description: 'Basic Markdown documentation',
    icon: '📝',
    category: 'static',
    files: {
      'README.md': `# Project Title

A brief description of the project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const example = "Hello";
\`\`\`

## Features

- Feature 1
- Feature 2
- Feature 3

## License

MIT
`,
    },
  },
];

export const getTemplateById = (id: string): ProjectTemplate | undefined => {
  return TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: string): ProjectTemplate[] => {
  return TEMPLATES.filter(t => t.category === category);
};
