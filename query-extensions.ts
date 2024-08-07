import { PgPolymorphicTypeMap, TYPES, pgPolymorphic, pgUnionAll, withPgClient } from 'postgraphile/@dataplan/pg';
import { gql, makeExtendSchemaPlugin } from 'postgraphile/utils';

/**
 * TODO:
 * Instead of manually defining `union Content = MovieCollection | SeasonCollection | Meta`
 * I tried to use `unionMember` which gave me an error saying `interface cannot be an union type`
 */

export const rootQueryExtensionsPlugin: GraphileConfig.Plugin = makeExtendSchemaPlugin((build) => {
    const {
        sql,
        input: { pgRegistry },
        grafast: { connection },
    } = build;
    const { cats, dogs } =
        pgRegistry.pgResources;
    return {
        typeDefs: gql`
        extend type Query {
            animals: AnimalsConnection
            animalById(id: String!): Animal
            cats: CatsConnection
            dogs: DogsConnection
        }
      `,
        plans: {
            Query: {
                animals($parent, fieldArgs) {
                    const $animals = pgUnionAll({
                        resourceByTypeName: {
                            Cat: cats,
                            Dog: dogs
                        },
                        name: 'Animal'
                    })

                    return connection($animals);
                },
                animalById($parent, fieldArgs) {
                    const $id = fieldArgs.get('id');

                    const $animals = pgUnionAll({
                        resourceByTypeName: {
                            Cat: cats,
                            Dog: dogs
                        },
                        name: 'Animal'
                    });
                    $animals.where(sql`${$animals.alias}.id = ${$animals.placeholder($id, TYPES.uuid)}`)

                    return $animals.single();
                },
                cats($parent, fieldArgs) {
                    const $cats = cats.find();

                    return connection($cats);
                },
                dogs($parent, fieldArgs) {
                    const $dogs = cats.find();

                    return connection($dogs);
                },
            },
        },
    };
});
