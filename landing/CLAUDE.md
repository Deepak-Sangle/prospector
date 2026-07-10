# TypeScript

## Type Safety

- No `any`, no `as` casting
- Derive types from Zod: `type X = z.infer<typeof XSchema>`
- Use `satisfies Required<SomeType>` for object creation (forces all fields, set missing to `null` / `undefined`)
- Use explicit types instead of `as const`
- No `readonly` interfaces
- **skipping explicit type annotation sometimes**: prefer skipping type annotation when the inferred type of the object (without type annotation) is more specific and useful than the annotated type. An explicit annotation widens the type to the constraint. Example: a map of heterogeneous Zod schemas should not `const map: Record<Key, z.ZodShape> = {...}` — just `const map = {...} so that its typed completely`. Now you may say that, we may forget to add another row to this record because its not typed with `Key` and thus won't throw any error. True, but most of the time, such Record is referenced using `map[key]`, and type of `key` is `Key` and thus if something doesn't exist in `map`, the `map[key]` would throw syntax error, thus solving this problem as well.
- Prefer `.map()` / `.flatMap()` over `for`/`forEach` + `push()`
- Return early to reduce nesting: `if (!x) return` before the happy path

## Type Reuse

- Define types once in `packages/common`; use `.pick()` / `.omit()` on Zod schemas
- DB types exported from `common` into backend come from Zod schemas (`src/schemas/prisma-schemas.ts`), not Prisma's generated types. Prisma functions accept the generated type. Ensure both stay in sync. We never use `Prisma.UserModel` directly.
- If some schema is not exported from common or other files, then don't define them again where you need them now, but actually export them from source file. If they cannot be exported directly (in case they are defined inline), then move them into a separate zod schema in same file and then export it.
- Always export `type` along with zod schema whenever defined.

## Function Reuse

- If a function is defined in a file but not exported, and you need something similar, export that function instead of duplicating the function definition at two places.
- If a function is defined and/or exported but does not satisfy your need completely, change / add arguments to that function to use it. Do not repeat the same code at different place. Do this only when you need to add / change minimal part of the existing function and you do not affect the rest of the codebase using that function.

## Immutability

- `const` over `let`; spread for updates; never mutate directly
- Do not change objects using `obj.field = 2` — create a new object: `const newObj = {...obj, field: 2}`
- Do not change array using `const arr = []; if(x) arr.push(y)` when you can just conditionally put elements like `const arr = [x ? y : null].compact()`
- Use `ts-pattern` over switch/if for pattern matching
- Inline exports: `export const X` / `export function x()` — don't export at end of file
- Don't create and call functions inline like `const some = await (async () => {...})()` — define a separate function instead

## Functional Programming

- No `class` keyword — pure functions and composition
- Single responsibility; large functions orchestrate smaller ones
- Files under 300 lines
- Named function declarations (`function name()` not `const name = () =>`)
- JSDoc on all exported functions

## File Placement

- If a helper function is generic (e.g. `formatMoney`, `formatDate`, `slugify`) and not tightly coupled to a single domain, **do not nest it inside `services/` or `repositories/`** — move it to the appropriate `util/` file at the nearest shared level (e.g. `apps/backend/src/util/prompt.ts`, `apps/backend/src/util/string.ts`)
- The test: if the function could be imported by two unrelated services without feeling wrong, it belongs in `util/`

## Code Style

- Destructure args inline: `function someFunction({field}: {field: string})` — not `function someFunction(args: {field: string}) { const {field} = args; ... }`
- **Never** use `void` — use `.then` and `.catch` on a promise if you don't want to await it
- Use `== null` instead of `=== null && === undefined`
- Do NOT use `Array<SomeType>` — use `SomeType[]`
- Always use `.at(0)` instead of `[0]`
- Always propagate errors — return `Result<string>` instead of `string | null` or throwing
- **Discriminated unions: always use a `type` field** to narrow variants — never use `field?: never` tricks. Each variant should only contain fields relevant to it. e.g. `type Result = { type: 'urls'; urls: string[] } | { type: 'sites'; sites: string[] }`
- Check `util/array.ts`, `util/string.ts` etc. for utility helpers before writing your own — e.g. `arr.compact()` removes nulls
- NEVER write comments like `  // ── App store discovery (conditional) ─────────────────────────────────────`, just `App store discovery (conditional)` is fine.

## Null Handling

- Have `if` condition inside a function instead of at the call site. Instead of `if (something) { await callFunction() }`, just call `callFunction()` and return early inside it — keeps callers clean and ensures the edge case is always handled
- **Never null-check a value before passing it to a function** — handle `null`/`undefined` inside the function itself with `if (value == null) return` at the top

## Naming Conventions

- Files: `kebab-case`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Zod schemas: `PascalCase` + `Schema` suffix
- Prisma models: `PascalCase`
- Stores: `camelCase` + `Store` suffix
- Hooks: `use` prefix

---

# Schema & Validation

- `.safeParse()` at trust boundaries only (API responses, external data, raw strings/JSON)
- Return early on parse failure
- Don't parse already-typed function params

# Zod Schemas

- Whenever you see code where there is ugly type narrowing like this typeof `if(data !== 'object' || data == null || !('data' in data) || !Array.isArray((data as Record<string, unknown>).data) ||)`, use zod schema for this, don't do things like Array.isArray, typeof data === 'object', etc.
- When creating Zod schemas that is passed to AI via structured API calls, add `.describe()` blocks with a concise description and example
- When making prompts for AI calls, do not describe the output schema — the Zod schema passed via structured API call already has all that information

## API Payload Schemas

- Define request + response schemas in `packages/common/src/api/`
- Backend validates request bodies at route entry
- Frontend validates responses after `apiClient` calls
- Never repeat the Zod schema in backend route or service files — use the schema from `common`, or manipulate it via `.pick()` / `.omit()` (Zod) or `UpdateInput` / `CreateInput` (Prisma)

---
