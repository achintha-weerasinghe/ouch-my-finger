import { isObjectType, Kind, parse, printType, type ConstArgumentNode, type ConstDirectiveNode, type NameNode, type ObjectTypeDefinitionNode, type ObjectTypeExtensionNode, type SchemaExtensionNode, type StringValueNode } from "postgraphile/graphql";

export const FederationPlugin: GraphileConfig.Plugin = {
  name: 'FederationPlugin',
  version: '1.0.0',
  schema: {
    hooks: {
      GraphQLSchema(schema, build) {
        const linkDirective = (schema.extensionASTNodes ?? []).flatMap((n) => n.directives ?? []).find((d) => d.name.value === 'link');
        if (!linkDirective) {
          const linkExtension: SchemaExtensionNode = {
            kind: Kind.SCHEMA_EXTENSION,
            directives: [
              {
                kind: Kind.DIRECTIVE,
                name: Name("link"),
                arguments: [
                  { kind: Kind.ARGUMENT, name: Name("url"), value: StringValue("https://specs.apollo.dev/federation/v2.7") },
                  {
                    kind: Kind.ARGUMENT,
                    name: Name("import"),
                    value: {
                      kind: Kind.LIST,
                      values: [
                        StringValue("@key"),
                        StringValue("@external"),
                        StringValue("@requires"),
                        StringValue("@provides"),
                        StringValue("@shareable"),
                        StringValue("@tag"),
                      ],
                    },
                  },
                ],
              },
            ],
          };
          schema.extensionASTNodes = [...(schema.extensionASTNodes ?? []), linkExtension];
        }

        const types = build.getAllTypes();
        for (const [typeName, namedType] of Object.entries(types)) {
          if (namedType && isObjectType(namedType) && ['Collection', 'Video'].includes(typeName)) {
            // Ensure we have a base AST definition; Apollo federations drops
            // types that only have extensions.
            if (!namedType.astNode) {
              const parsed = parse(printType(namedType));
              const definition = parsed.definitions.find(
                (def): def is ObjectTypeDefinitionNode =>
                  def.kind === Kind.OBJECT_TYPE_DEFINITION &&
                  def.name.value === namedType.name,
              );
              if (definition) {
                (namedType as any).astNode = definition;
              }
            }

            const existingDirectives = [
              ...(namedType.astNode?.directives ?? []),
              ...((namedType.extensionASTNodes ?? []).flatMap((n) => n.directives ?? [])),
            ];
            const hasKey = existingDirectives.some((d) => d.name.value === 'key');

            if (!hasKey) {
              const keyExtension: ObjectTypeExtensionNode = {
                kind: Kind.OBJECT_TYPE_EXTENSION,
                name: Name(namedType.name),
                directives: [Directive("key", { fields: StringValue("id") })],
              };
              namedType.extensionASTNodes = [
                ...(namedType.extensionASTNodes ?? []),
                keyExtension,
              ];
            }
          }
        }

        return schema;
      }
    }
  }
}

/**
 * Construct AST `ObjectTypeDefinition` node required for Apollo Federation's printSchema.
 * @param spec The field specification.
 * @returns The AST `ObjectTypeDefinition` node.
 */
export function ObjectTypeDefinition(spec: {
  name: string;
  description?: string | null;
}): ObjectTypeDefinitionNode {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: Name(spec.name),
    description: spec.description
      ? StringValue(spec.description, true)
      : undefined,
    directives: [],
  };
}

/**
 * Construct AST `name` node required for Apollo Federation's printSchema.
 * @param value The value.
 * @returns The AST name node.
 */
export function Name(value: string): NameNode {
  return {
    kind: Kind.NAME,
    value,
  };
}

/**
 * Construct AST `StringValue` node required for Apollo Federation's printSchema.
 * @param value The value.
 * @param block A value indicating whether or not to block.
 * @returns The AST `stringValue` node.
 */
export function StringValue(value: string, block = false): StringValueNode {
  return {
    kind: Kind.STRING,
    value,
    block: block,
  };
}

/**
 * Construct AST `Directive` node required for Apollo Federation's printSchema.
 * @param name The GraphQL directive.
 * @param args The directive args.
 * @returns The AST `Directive` node.
 */
export function Directive(
  name: string,
  args: { [argName: string]: unknown } = {},
): ConstDirectiveNode {
  return {
    kind: Kind.DIRECTIVE,
    name: Name(name),
    arguments: Object.entries(args).map(
      ([argName, value]) =>
      ({
        kind: "Argument",
        name: Name(argName),
        value,
      } as ConstArgumentNode),
    ),
  };
}
