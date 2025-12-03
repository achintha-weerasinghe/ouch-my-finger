# Federation Q&A

## 1) Where does `extend schema @link(...)` come from, and why doesn’t PostGraphile complain?

- `@link` is defined by Apollo Federation Core (Fed2) to import directive definitions into a subgraph. It is **not** part of base GraphQL.
- PostGraphile doesn’t error because we attach `@link` as an AST schema extension, but we’re not asking GraphQL.js to validate/execute that extension. Federation tooling (Apollo composition/printSubgraphSchema) reads it, while PostGraphile’s runtime ignores it.
- Similarly, `@key` “works” without `@link` because GraphQL.js lets you attach unknown directives to AST nodes; only when Apollo composes/prints does it expect the federation core metadata (including `@link`). Adding `@link` keeps the SDL closer to spec, but PostGraphile will still serve the schema since it doesn’t enforce those directive definitions.

## 2) Making `Collection` an interface with concrete types the mock doesn’t know

Goal: DB adds `type` column (`MOVIE` | `SERIES`), PostGraphile exposes `interface Collection` and concrete types `MovieCollection`/`SeriesCollection` implementing it. The mock only emits `Collection` references with `id`.

Approach (PostGraphile subgraph):

```graphql
# PostGraphile subgraph SDL sketch
interface Collection @key(fields: "id") {
  id: ID!
  title: String!
}

type MovieCollection implements Collection @key(fields: "id") {
  id: ID!
  title: String!
  runtimeMins: Int
}

type SeriesCollection implements Collection @key(fields: "id") {
  id: ID!
  title: String!
  seasonCount: Int
}
```

Resolver sketch:
- `_entities` returns a concrete `__typename` based on the DB `type` column (e.g., `MovieCollection` vs `SeriesCollection`).

Mock subgraph (using `@interfaceObject` so it can return interface stubs):

```graphql
extend type Collection
  @key(fields: "id")
  @interfaceObject {
  id: ID! @external
}

extend type Query {
  collectionRefs: [Collection!]!
}
```

Notes:
- `@interfaceObject` is an Apollo Federation directive that lets a subgraph expose an “interface entity object” so it can return references to an interface without picking a concrete implementing type. Without it, returning an interface-only ref fails composition.
- The router composes the mock’s interface-object stub with the PostGraphile subgraph; PostGraphile’s `_entities` resolver uses the DB row to return the concrete type/fields.

Pseudo resolver for entity lookup (PostGraphile side):

Key points:
- Keep `@key` on the interface and on each implementing type.
- Use `@interfaceObject` in any subgraph that only emits interface references.
- Always return a concrete `__typename` from the owning subgraph’s entity resolver.
