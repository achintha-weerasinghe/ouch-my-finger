import { condition, constant, get, lambda, Step } from "postgraphile/grafast";
import { extendSchema, gql } from "postgraphile/utils";
import { printSubgraphSchema } from "@apollo/subgraph";
import { GraphQLScalarType, Kind, valueFromASTUntyped } from "postgraphile/graphql";
import { conditionalReturn } from "./steps/conditional-return-step.ts";


export const ExtendSchemaPlugin = extendSchema((build) => {
    const { input: { pgRegistry: { pgResources } } } = build;
    const { collections, videos } = pgResources;

    return {
        typeDefs: gql`
            """
            Basic scalar used by federation to shuttle arbitrary representation objects.
            """
            scalar _Any
            union _Entity = MovieCollection | SeriesCollection | Video
            type _Service {
                sdl: String!
            }

            extend type Query {
                _entities(representations: [_Any!]!): [_Entity]!
                 _service: _Service!
            }
        `,
        scalars: {
            _Any: new GraphQLScalarType({
                name: "_Any",
                serialize: (value) => value,
                parseValue: (value) => value,
                parseLiteral: (ast) => valueFromASTUntyped(ast, {}),
            }),
        },
        unions: {
            _Entity: {
                planType($specifier: Step<{ __typename: string; id: string }>) {
                    const $type = conditionalReturn(
                        condition('===', get($specifier, '__typename'), constant('Collection')),
                        collections.get({ id: get($specifier, 'id') }).get('type'),
                        get($specifier, '__typename'),
                    );
                    const $__typename = lambda($type, entityTypeName, true);

                    return {
                        $__typename,
                        planForType(t) {
                            switch (t.name) {
                                case 'MovieCollection': 
                                case 'SeriesCollection': {
                                    return collections.get({ id: get($specifier, 'id') });
                                }
                                case 'Video': {
                                    return videos.get({ id: get($specifier, 'id') })
                                }
                                default: {
                                    console.warn(`Don't know how to fetch ${t.name}`);
                                    return null;
                                }
                            }
                        },
                    };
                },
            }
        },
        objects: {
            Query: {
                plans: {
                    _entities(_, { $representations }) {
                        // Representations are already JS objects thanks to the _Any scalar.
                        return $representations;
                    },
                    _service(_, _args, { schema }) {
                        return constant(printSubgraphSchema(schema));
                    }
                }
            },
            _Service: {
                plans: {
                    sdl($schema) {
                        return $schema
                    }
                }
            }
        }
    }
})

function entityTypeName(type: unknown): string | null {
    return (
        {
            movie: 'MovieCollection',
            series: 'SeriesCollection',
            Video: 'Video',
        }[type as string] ?? null
    );
}
