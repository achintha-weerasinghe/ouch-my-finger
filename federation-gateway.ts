import { ApolloGateway, IntrospectAndCompose } from "@apollo/gateway";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "postgraphile/graphql";
import fs from 'fs/promises'
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Ref = { __typename: "Collection" | "Video"; id: string };

async function fetchIdsFromPostgraphile(): Promise<{
  collections: Ref[];
  videos: Ref[];
}> {
  const url = process.env.POSTGRAPHILE_URL ?? "http://localhost:5678/graphql";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query BootstrapIds {
            allCollections(first: 5) {
              nodes { id }
            }
            allVideos(first: 5) {
              nodes { id }
            }
          }
        `,
      }),
    });
    const json = await res.json() as any;
    const collections =
      json.data?.allCollections?.nodes?.map(
        (n: { id: string }) => ({ __typename: "Collection" as const, id: n.id }),
      ) ?? [];
    const videos =
      json.data?.allVideos?.nodes?.map(
        (n: { id: string }) => ({ __typename: "Video" as const, id: n.id }),
      ) ?? [];
    return { collections, videos };
  } catch (e) {
    console.warn("Failed to prefetch ids from PostGraphile; using fallbacks", e);
    return { collections: [], videos: [] };
  }
}

async function startMockSubgraph() {
  const ids = await fetchIdsFromPostgraphile();
  const collectionRefs = ids.collections.length
    ? ids.collections
    : [{ __typename: "Collection", id: "stub-collection-id" }];
  const videoRefs = ids.videos.length
    ? ids.videos
    : [{ __typename: "Video", id: "stub-video-id" }];

  const typeDefs = parse(/* GraphQL */ `
    extend schema
      @link(
        url: "https://specs.apollo.dev/federation/v2.7"
        import: ["@key", "@external", "@interfaceObject"]
      )

    extend type Query {
      collectionRefs: [Collection!]!
      videoRefs: [Video!]!
    }

    # This subgraph only produces references; PostGraphile owns the fields.
    extend type Collection @key(fields: "id") @interfaceObject {
      id: String! @external
    }

    extend type Video @key(fields: "id") {
      id: String! @external
    }
  `);

  const resolvers = {
    Query: {
      collectionRefs: () => collectionRefs,
      videoRefs: () => videoRefs,
    },
  };

  const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);
  const server = new ApolloServer({ schema });
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.MOCK_SUBGRAPH_PORT) || 4002 },
  });
  return url;
}

async function startGateway() {
  const mockUrl = await startMockSubgraph();
  const postgraphileUrl =
    process.env.POSTGRAPHILE_URL ?? "http://localhost:5678/graphql";

  const generatedDir = `${__dirname}/generated`;
  await fs.mkdir(generatedDir, { recursive: true });

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: "pg", url: postgraphileUrl },
        { name: "mock", url: process.env.MOCK_SUBGRAPH_URL ?? mockUrl },
      ],
    }),
  });

  // Capture supergraph SDL on load/update and write to disk.
  const outPath = `${generatedDir}/supergraph.graphql`;
  gateway.onSchemaLoadOrUpdate(({ coreSupergraphSdl }) => {
    void fs.writeFile(outPath, coreSupergraphSdl, "utf-8")
      .then(() => console.log(`Wrote supergraph SDL to ${outPath}`))
      .catch((e) => console.warn("Failed to write supergraph SDL", e));
  });

  const server = new ApolloServer({ gateway });
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.GATEWAY_PORT) || 4000 },
  });

  console.log(`Gateway ready at ${url}`);
  console.log(`Mock subgraph ready at ${process.env.MOCK_SUBGRAPH_URL ?? mockUrl}`);
  console.log(`PostGraphile subgraph expected at ${postgraphileUrl}`);
}

startGateway().catch((e) => {
  console.error("Failed to start gateway", e);
  process.exit(1);
});
