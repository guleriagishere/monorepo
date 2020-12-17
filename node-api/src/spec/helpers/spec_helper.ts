// graphql
import { gql } from 'apollo-server-express';
import { graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import resolvers from '../../graphql/resolvers';
import getSchemaFiles from '../../graphql/typedefs';
const typeDefs = gql(getSchemaFiles());
const schema = makeExecutableSchema({ typeDefs, resolvers });

// spec helpers
export const callGraphql = async (
    query: any,
    variables?: any
) => {
    return graphql(
        schema,
        query,
        undefined,
        {},
        variables
    );
};


