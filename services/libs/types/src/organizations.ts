import { IAttributes } from './attributes'

export interface IOrganization {
  id?: string
  name: string
  url?: string
  description?: string
  emails?: string[]
  logo?: string
  tags?: string[]
  github?: IOrganizationSocial | string
  twitter?: IOrganizationSocial | string
  linkedin?: IOrganizationSocial | string
  crunchbase?: IOrganizationSocial | string
  employees?: number
  location?: string
  website?: string
  type?: string
  size?: string
  headline?: string
  industry?: string
  founded?: string
  attributes?: IAttributes
}

export interface IOrganizationSocial {
  handle: string
  url?: string
}

export interface IOrganizationOpensearch {
  id: string
  logo: string
  displayName: string
}
