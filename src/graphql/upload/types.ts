import { gql } from 'graphql-tag';

export const uploadTypes = gql`
  scalar Upload

  type UploadResponse {
    url: String!
    key: String!
  }

  extend type Mutation {
    uploadFile(file: Upload!, folder: String): UploadResponse!
  }
`; 