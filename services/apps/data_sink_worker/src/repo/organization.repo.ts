import { DbColumnSet, DbStore, RepositoryBase } from '@crowd/database'
import { Logger } from '@crowd/logging'
import {
  IDbCacheOrganization,
  IDbInsertOrganizationData,
  IDbOrganization,
  IDbUpdateOrganizationCacheData,
  IDbUpdateOrganizationData,
  getInsertCacheOrganizationColumnSet,
  getInsertOrganizationColumnSet,
  getUpdateCacheOrganizationColumnSet,
  getUpdateOrganizationColumnSet,
} from './organization.data'
import { generateUUIDv1 } from '@crowd/common'

export class OrganizationRepository extends RepositoryBase<OrganizationRepository> {
  private readonly insertCacheOrganizationColumnSet: DbColumnSet
  private readonly updateCacheOrganizationColumnSet: DbColumnSet

  private readonly insertOrganizationColumnSet: DbColumnSet
  private readonly updateOrganizationColumnSet: DbColumnSet

  constructor(dbStore: DbStore, parentLog: Logger) {
    super(dbStore, parentLog)

    this.insertCacheOrganizationColumnSet = getInsertCacheOrganizationColumnSet(this.dbInstance)
    this.updateCacheOrganizationColumnSet = getUpdateCacheOrganizationColumnSet(this.dbInstance)

    this.insertOrganizationColumnSet = getInsertOrganizationColumnSet(this.dbInstance)
    this.updateOrganizationColumnSet = getUpdateOrganizationColumnSet(this.dbInstance)
  }

  public async findCacheByName(name: string): Promise<IDbCacheOrganization | null> {
    const result = await this.db().oneOrNone(
      `
      select  id,
              name,
              url,
              description,
              emails,
              logo,
              tags,
              github,
              twitter,
              linkedin,
              crunchbase,
              employees,
              location,
              website,
              type,
              size,
              headline,
              industry,
              founded
      from "organizationCaches"
      where name = $(name);`,
      { name },
    )

    return result
  }

  public async insertCache(data: IDbInsertOrganizationData): Promise<string> {
    const id = generateUUIDv1()
    const ts = new Date()
    const prepared = RepositoryBase.prepare(
      {
        ...data,
        id,
        createdAt: ts,
        updatedAt: ts,
      },
      this.insertCacheOrganizationColumnSet,
    )

    const query = this.dbInstance.helpers.insert(prepared, this.insertCacheOrganizationColumnSet)
    await this.db().none(query)
    return id
  }

  public async updateCache(id: string, data: IDbUpdateOrganizationCacheData): Promise<void> {
    const prepared = RepositoryBase.prepare(
      {
        ...data,
        updatedAt: new Date(),
      },
      this.updateCacheOrganizationColumnSet,
    )

    const query = this.dbInstance.helpers.update(prepared, this.updateCacheOrganizationColumnSet)
    const condition = this.format('where id = $(id)', { id })

    const result = await this.db().result(`${query} ${condition}`)

    this.checkUpdateRowCount(result.rowCount, 1)
  }

  public async findByName(
    tenantId: string,
    segmentId: string,
    name: string,
  ): Promise<IDbOrganization> {
    const result = await this.db().oneOrNone(
      `
      select  o.id,
              o.name,
              o.url,
              o.description,
              o.emails,
              o.logo,
              o.tags,
              o.github,
              o.twitter,
              o.linkedin,
              o.crunchbase,
              o.employees,
              o.location,
              o.website,
              o.type,
              o.size,
              o.headline,
              o.industry,
              o.founded,
              o.attributes
      from organizations o
      where o."tenantId" = $(tenantId) and o.name = $(name)
      and o.id in (select os."organizationId"
                    from "organizationSegments" os
                      where os."segmentId" = $(segmentId))`,
      { tenantId, name, segmentId },
    )

    return result
  }

  public async findBySourceId(
    tenantId: string,
    segmentId: string,
    platform: string,
    sourceId: string,
  ): Promise<IDbOrganization> {
    const result = await this.db().oneOrNone(
      `
      select  o.id,
              o.name,
              o.url,
              o.description,
              o.emails,
              o.logo,
              o.tags,
              o.github,
              o.twitter,
              o.linkedin,
              o.crunchbase,
              o.employees,
              o.location,
              o.website,
              o.type,
              o.size,
              o.headline,
              o.industry,
              o.founded,
              o.attributes
      from organizations o
      where o."tenantId" = $(tenantId) and COALESCE(((o.attributes -> 'sourceId'::text) ->> '${platform}'::text)::text, '') = $(sourceId)
      and o.id in (select os."organizationId"
                    from "organizationSegments" os
                      where os."segmentId" = $(segmentId))`,
      { tenantId, sourceId, segmentId },
    )

    return result
  }

  public async insert(tenantId: string, data: IDbInsertOrganizationData): Promise<string> {
    const id = generateUUIDv1()
    const ts = new Date()
    const prepared = RepositoryBase.prepare(
      {
        ...data,
        id,
        tenantId,
        createdAt: ts,
        updatedAt: ts,
      },
      this.insertOrganizationColumnSet,
    )

    const query = this.dbInstance.helpers.insert(prepared, this.insertOrganizationColumnSet)
    await this.db().none(query)
    return id
  }

  public async update(id: string, data: IDbUpdateOrganizationData): Promise<void> {
    const prepared = RepositoryBase.prepare(
      {
        ...data,
        updatedAt: new Date(),
      },
      this.updateOrganizationColumnSet,
    )

    const query = this.dbInstance.helpers.update(prepared, this.updateOrganizationColumnSet)
    const condition = this.format('where id = $(id)', { id })

    const result = await this.db().result(`${query} ${condition}`)

    this.checkUpdateRowCount(result.rowCount, 1)
  }

  public async addToSegments(tenantId: string, segmentId: string, orgIds: string[]): Promise<void> {
    const parameters: Record<string, unknown> = {
      tenantId,
      segmentId,
    }

    const valueStrings = []
    for (let i = 0; i < orgIds.length; i++) {
      const orgId = orgIds[i]
      parameters[`orgId_${i}`] = orgId
      valueStrings.push(`($(tenantId), $(segmentId), $(orgId_${i}), now())`)
    }

    const valueString = valueStrings.join(',')

    const query = `
    insert into "organizationSegments"("tenantId", "segmentId", "organizationId", "createdAt")
    values ${valueString}
    on conflict do nothing;
    `

    await this.db().none(query, parameters)
  }

  public async addToMember(memberId: string, orgIds): Promise<void> {
    const parameters: Record<string, unknown> = {
      memberId,
    }

    const valueStrings = []
    for (let i = 0; i < orgIds.length; i++) {
      const orgId = orgIds[i]
      parameters[`orgId_${i}`] = orgId
      valueStrings.push(`($(orgId_${i}), $(memberId), now(), now())`)
    }

    const valueString = valueStrings.join(',')

    const query = `
    insert into "memberOrganizations"("organizationId", "memberId", "createdAt", "updatedAt")
    values ${valueString}
    on conflict do nothing;
    `

    await this.db().none(query, parameters)
  }
}
