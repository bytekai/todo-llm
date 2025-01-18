# Todo CLI

A simple command-line todo application built with TypeScript that uses Pugh matrix scoring for task prioritization.

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```
3. Build the project:
```bash
npm run build
```
4. Link the CLI globally (optional):
```bash
npm link
```

## Usage

### Add a new todo
```bash
todo add
```
You'll be prompted to enter:
- Todo text
- Category
- Priority (0-10)
- Effort (0-10)
- Value (0-10)

### List todos
```bash
todo list
```
Todos are sorted by Pugh matrix score by default. The score is calculated using:
- Priority (40% weight)
- Value (40% weight)
- Effort (-20% weight)
- Category weight multiplier

The output shows:
- ID: Todo identifier
- P/E/V: Priority/Effort/Value scores
- Score: Calculated Pugh matrix score
- Category: Todo category
- Status: Completion status
- Text: Todo description

### List todos by category
```bash
todo list --category work
```
or use the short form:
```bash
todo list -c work
```

### List with different sorting
```bash
todo list --sort id
```
Available sort methods:
- `pugh` (default): Sort by Pugh matrix score
- `id`: Sort by ID

### Mark a todo as complete
```bash
todo complete <id>
```

### Category Management

#### List all categories
```bash
todo categories list
```
Shows categories and their weights

#### Add a new category
```bash
todo categories add
```
You'll be prompted for:
- Category name
- Category weight (0-5)

#### Update category weight
```bash
todo categories weight <category> <weight>
```
Updates the weight of an existing category (weight range: 0-5)

### Get help
```bash
todo --help
```
