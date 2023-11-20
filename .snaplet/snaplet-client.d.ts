type JsonPrimitive = null | number | string | boolean;
type Nested<V> = V | { [s: string]: V | Nested<V> } | Array<V | Nested<V>>;
type Json = Nested<JsonPrimitive>;

type ColumnValueCallbackContext = {
  /**
   * The seed of the field's model.
   *
   * \@example
   * ```ts
   * "<hash>/0/users/0"
   * ```
   */
  modelSeed: string;
  /**
   * The seed of the field.
   *
   * \@example
   * ```ts
   * "<hash>/0/users/0/email"
   * ```
   */
  seed: string;
};

/**
 * helper type to get the possible values of a scalar field
 */
type ColumnValue<T> = T | ((ctx: ColumnValueCallbackContext) => T);

/**
 * helper type to map a record of scalars to a record of ColumnValue
 */
type MapToColumnValue<T> = { [K in keyof T]: ColumnValue<T[K]> };

/**
 * Create an array of `n` models.
 *
 * Can be read as "Generate `model` times `n`".
 *
 * @param `n` The number of models to generate.
 * @param `callbackFn` The `x` function calls the `callbackFn` function one time for each element in the array.
 *
 * @example Generate 10 users:
 * ```ts
 * snaplet.users((x) => x(10));
 * ```
 *
 * @example Generate 3 projects with a specific name:
 * ```ts
 * snaplet.projects((x) => x(3, (index) => ({ name: `Project ${index}` })));
 * ```
 */
declare function xCallbackFn<T>(
  n: number | MinMaxOption,
  callbackFn?: (index: number) => T
): Array<T>;

type ChildCallbackInputs<T> = (
  x: typeof xCallbackFn<T>,
) => Array<T>;

/**
 * all the possible types for a child field
 */
type ChildInputs<T> = Array<T> | ChildCallbackInputs<T>;

/**
 * omit some keys TKeys from a child field
 * @example we remove ExecTask from the Snapshot child field values as we're coming from ExecTask
 * type ExecTaskChildrenInputs<TPath extends string[]> = {
 *   Snapshot: OmitChildInputs<SnapshotChildInputs<[...TPath, "Snapshot"]>, "ExecTask">;
 * };
 */
type OmitChildInputs<T, TKeys extends string> = T extends ChildCallbackInputs<
  infer U
>
  ? ChildCallbackInputs<Omit<U, TKeys>>
  : T extends Array<infer U>
  ? Array<Omit<U, TKeys>>
  : never;

type ConnectCallbackContext<TGraph, TPath extends string[]> = {
  /**
   * The branch of the current iteration for the relationship field.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#branch | documentation}.
   */
  branch: GetBranch<TGraph, TPath>;
  /**
   * The plan's graph.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#graph | documentation}.
   */
  graph: TGraph;
  /**
   * The index of the current iteration.
   */
  index: number;
  /**
   * The seed of the relationship field.
   */
  seed: string;
  /**
   * The plan's store.
   */
  store: Store;
};

/**
 * the callback function we can pass to a parent field to connect it to another model
 * @example
 * snaplet.Post({ User: (ctx) => ({ id: ctx.store.User[0] }) })
 */
type ConnectCallback<T, TGraph, TPath extends string[]> = (
  ctx: ConnectCallbackContext<TGraph, TPath>
) => T;

/**
 * compute the Graph type and the tracked path to pass to the connect callback
 */
type ParentCallbackInputs<T, TPath extends string[]> = TPath extends [
  infer TRoot,
  ...infer TRest extends string[],
]
  ? TRoot extends keyof Graph
    ? MergeGraphParts<Graph[TRoot]> extends infer TGraph
      ? ConnectCallback<T, TGraph, TRest>
      : never
    : never
  : never;

type ParentInputs<T, TPath extends string[]> =
  | T
  | ParentCallbackInputs<T, TPath>;

/**
 * omit some keys TKeys from a parent field
 * @example we remove Member from the Organization and User parent fields values as we're coming from Member
 * type MemberParentsInputs<TPath extends string[]> = {
 *   Organization: OmitParentInputs<OrganizationParentInputs<[...TPath, "Organization"]>, "Member", [...TPath, "Organization"]>;
 *   User: OmitParentInputs<UserParentInputs<[...TPath, "User"]>, "Member", [...TPath, "User"]>;
 * };
 */
type OmitParentInputs<
  T,
  TKeys extends string,
  TPath extends string[],
> = T extends ConnectCallback<infer U, any, any>
  ? ParentCallbackInputs<Omit<U, TKeys>, TPath>
  : Omit<T, TKeys>;

/**
 * compute the inputs type for a given model
 */
type Inputs<TScalars, TParents, TChildren> = Partial<
  MapToColumnValue<TScalars> & TParents & TChildren
>;

type OmitChildGraph<
  T extends Array<unknown>,
  TKeys extends string,
> = T extends Array<
  infer TGraph extends { Scalars: any; Parents: any; Children: any }
>
  ? Array<{
      Scalars: TGraph["Scalars"];
      Parents: TGraph["Parents"];
      Children: Omit<TGraph["Children"], TKeys>;
    }>
  : never;

type OmitParentGraph<
  T extends Array<unknown>,
  TKeys extends string,
> = T extends Array<
  infer TGraph extends { Scalars: any; Parents: any; Children: any }
>
  ? Array<{
      Scalars: TGraph["Scalars"];
      Parents: Omit<TGraph["Parents"], TKeys>;
      Children: TGraph["Children"];
    }>
  : never;

type UnwrapArray<T> = T extends Array<infer U> ? U : T;

type DeepUnwrapKeys<TGraph, TKeys extends any[]> = TKeys extends [
  infer THead,
  ...infer TTail,
]
  ? TTail extends any[]
    ? {
        [P in keyof TGraph]: P extends THead
          ? DeepUnwrapKeys<UnwrapArray<TGraph[P]>, TTail>
          : TGraph[P];
      }
    : TGraph
  : TGraph;

type GetBranch<T, K extends any[]> = T extends Array<infer U>
  ? DeepUnwrapKeys<U, K>
  : T;

type MergeGraphParts<T> = T extends Array<
  infer U extends { Scalars: unknown; Parents: unknown; Children: unknown }
>
  ? Array<
      U["Scalars"] & {
        [K in keyof U["Children"]]: MergeGraphParts<U["Children"][K]>;
      } & {
        [K in keyof U["Parents"]]: MergeGraphParts<
          U["Parents"][K]
        > extends Array<infer TParent>
          ? TParent
          : never;
      }
    >
  : never;

/**
 * the configurable map of models' generate and connect functions
 */
export type UserModels = {
  [KStore in keyof Store]?: Store[KStore] extends Array<
    infer TFields extends Record<string, any>
  >
    ? {
        connect?: (ctx: { store: Store }) => TFields;
        data?: Partial<MapToColumnValue<TFields>>;
      }
    : never;
};

type PlanOptions = {
  /**
   * Connect the missing relationships to one of the corresponding models in the store.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#using-autoconnect-option | documentation}.
   */
  autoConnect?: boolean;
  /**
   * Provide custom data generation and connect functions for this plan.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#using-autoconnect-option | documentation}.
   */
  models?: UserModels;
  /**
   * Pass a custom store instance to use for this plan.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#augmenting-external-data-with-createstore | documentation}.
   */
  store?: StoreInstance;
  /**
   * Use a custom seed for this plan.
   */
  seed?: string;
};

/**
 * the plan is extending PromiseLike so it can be awaited
 * @example
 * await snaplet.User({ name: "John" });
 */
export interface Plan extends PromiseLike<any> {
  generate: (initialStore?: Store) => Promise<Store>;
  /**
   * Compose multiple plans together, injecting the store of the previous plan into the next plan.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#using-pipe | documentation}.
   */
  pipe: Pipe;
  /**
   * Compose multiple plans together, without injecting the store of the previous plan into the next plan.
   * All stores stay independent and are merged together once all the plans are generated.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#using-merge | documentation}.
   */
  merge: Merge;
}

type Pipe = (plans: Plan[], options?: { models?: UserModels, seed?: string }) => Plan;

type Merge = (plans: Plan[], options?: { models?: UserModels, seed?: string }) => Plan;

type StoreInstance<T extends Partial<Store> = {}> = {
  _store: T;
  toSQL: () => string[];
};

type CreateStore = <T extends Partial<Store>>(
  initialData?: T,
  options?: { external: boolean },
) => StoreInstance<T>;
type Store = {
  channel: Array<channelScalars>;
  channel_member: Array<channel_memberScalars>;
  channel_thread: Array<channel_threadScalars>;
  channel_thread_message: Array<channel_thread_messageScalars>;
  user_message: Array<user_messageScalars>;
  users: Array<usersScalars>;
  workspace: Array<workspaceScalars>;
  workspace_member: Array<workspace_memberScalars>;
  workspace_user_type: Array<workspace_user_typeScalars>;
};

type channelScalars = {
  /**
   * Column `channel.id`.
   */
  id: string;
  /**
   * Column `channel.name`.
   */
  name: string;
  /**
   * Column `channel.is_public`.
   */
  is_public: boolean;
  /**
   * Column `channel.workspace_id`.
   */
  workspace_id: string;
  /**
   * Column `channel.created_at`.
   */
  created_at?: string;
  /**
   * Column `channel.updated_at`.
   */
  updated_at?: string;
  /**
   * Column `channel.created_by`.
   */
  created_by: string;
}
type channelParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `channel` to table `workspace` through the column `channel.workspace_id`.
   */
  workspace: OmitParentInputs<workspaceParentInputs<[...TPath, "workspace"]>, "channel", [...TPath, "workspace"]>;
};
type channelChildrenInputs<TPath extends string[]> = {
  /**
  * Relationship from table `channel` to table `channel_member` through the column `channel_member.channel_id`.
  */
  channel_member: OmitChildInputs<channel_memberChildInputs<[...TPath, "channel_member"]>, "channel" | "channel_id">;
  /**
  * Relationship from table `channel` to table `channel_thread` through the column `channel_thread.channel_id`.
  */
  channel_thread: OmitChildInputs<channel_threadChildInputs<[...TPath, "channel_thread"]>, "channel" | "channel_id">;
};
type channelInputs<TPath extends string[]> = Inputs<
  channelScalars,
  channelParentsInputs<TPath>,
  channelChildrenInputs<TPath>
>;
type channelChildInputs<TPath extends string[]> = ChildInputs<channelInputs<TPath>>;
type channelParentInputs<TPath extends string[]> = ParentInputs<
channelInputs<TPath>,
  TPath
>;
type channel_memberScalars = {
  /**
   * Column `channel_member.id`.
   */
  id: string;
  /**
   * Column `channel_member.channel_id`.
   */
  channel_id: string;
  /**
   * Column `channel_member.user_id`.
   */
  user_id: string;
  /**
   * Column `channel_member.created_at`.
   */
  created_at?: string;
  /**
   * Column `channel_member.updated_at`.
   */
  updated_at?: string;
}
type channel_memberParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `channel_member` to table `channel` through the column `channel_member.channel_id`.
   */
  channel: OmitParentInputs<channelParentInputs<[...TPath, "channel"]>, "channel_member", [...TPath, "channel"]>;
  /**
   * Relationship from table `channel_member` to table `users` through the column `channel_member.user_id`.
   */
  users: OmitParentInputs<usersParentInputs<[...TPath, "users"]>, "channel_member", [...TPath, "users"]>;
};
type channel_memberChildrenInputs<TPath extends string[]> = {

};
type channel_memberInputs<TPath extends string[]> = Inputs<
  channel_memberScalars,
  channel_memberParentsInputs<TPath>,
  channel_memberChildrenInputs<TPath>
>;
type channel_memberChildInputs<TPath extends string[]> = ChildInputs<channel_memberInputs<TPath>>;
type channel_memberParentInputs<TPath extends string[]> = ParentInputs<
channel_memberInputs<TPath>,
  TPath
>;
type channel_threadScalars = {
  /**
   * Column `channel_thread.id`.
   */
  id: string;
  /**
   * Column `channel_thread.channel_id`.
   */
  channel_id: string;
  /**
   * Column `channel_thread.created_at`.
   */
  created_at?: string;
  /**
   * Column `channel_thread.updated_at`.
   */
  updated_at?: string;
}
type channel_threadParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `channel_thread` to table `channel` through the column `channel_thread.channel_id`.
   */
  channel: OmitParentInputs<channelParentInputs<[...TPath, "channel"]>, "channel_thread", [...TPath, "channel"]>;
};
type channel_threadChildrenInputs<TPath extends string[]> = {
  /**
  * Relationship from table `channel_thread` to table `channel_thread_message` through the column `channel_thread_message.channel_thread_id`.
  */
  channel_thread_message: OmitChildInputs<channel_thread_messageChildInputs<[...TPath, "channel_thread_message"]>, "channel_thread" | "channel_thread_id">;
};
type channel_threadInputs<TPath extends string[]> = Inputs<
  channel_threadScalars,
  channel_threadParentsInputs<TPath>,
  channel_threadChildrenInputs<TPath>
>;
type channel_threadChildInputs<TPath extends string[]> = ChildInputs<channel_threadInputs<TPath>>;
type channel_threadParentInputs<TPath extends string[]> = ParentInputs<
channel_threadInputs<TPath>,
  TPath
>;
type channel_thread_messageScalars = {
  /**
   * Column `channel_thread_message.id`.
   */
  id: string;
  /**
   * Column `channel_thread_message.user_id`.
   */
  user_id: string;
  /**
   * Column `channel_thread_message.channel_thread_id`.
   */
  channel_thread_id: string;
  /**
   * Column `channel_thread_message.message`.
   */
  message: string;
  /**
   * Column `channel_thread_message.created_at`.
   */
  created_at?: string;
  /**
   * Column `channel_thread_message.updated_at`.
   */
  updated_at?: string;
}
type channel_thread_messageParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `channel_thread_message` to table `channel_thread` through the column `channel_thread_message.channel_thread_id`.
   */
  channel_thread: OmitParentInputs<channel_threadParentInputs<[...TPath, "channel_thread"]>, "channel_thread_message", [...TPath, "channel_thread"]>;
  /**
   * Relationship from table `channel_thread_message` to table `users` through the column `channel_thread_message.user_id`.
   */
  users: OmitParentInputs<usersParentInputs<[...TPath, "users"]>, "channel_thread_message", [...TPath, "users"]>;
};
type channel_thread_messageChildrenInputs<TPath extends string[]> = {

};
type channel_thread_messageInputs<TPath extends string[]> = Inputs<
  channel_thread_messageScalars,
  channel_thread_messageParentsInputs<TPath>,
  channel_thread_messageChildrenInputs<TPath>
>;
type channel_thread_messageChildInputs<TPath extends string[]> = ChildInputs<channel_thread_messageInputs<TPath>>;
type channel_thread_messageParentInputs<TPath extends string[]> = ParentInputs<
channel_thread_messageInputs<TPath>,
  TPath
>;
type user_messageScalars = {
  /**
   * Column `user_message.id`.
   */
  id: string;
  /**
   * Column `user_message.user_id`.
   */
  user_id: string;
  /**
   * Column `user_message.recipient_id`.
   */
  recipient_id: string;
  /**
   * Column `user_message.message`.
   */
  message: string;
  /**
   * Column `user_message.created_at`.
   */
  created_at?: string;
  /**
   * Column `user_message.updated_at`.
   */
  updated_at?: string;
  /**
   * Column `user_message.workspace_id`.
   */
  workspace_id: string;
}
type user_messageParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `user_message` to table `users` through the column `user_message.recipient_id`.
   */
  users_user_message_recipient_idTousers: OmitParentInputs<usersParentInputs<[...TPath, "users_user_message_recipient_idTousers"]>, "user_message_user_message_recipient_idTousers", [...TPath, "users_user_message_recipient_idTousers"]>;
  /**
   * Relationship from table `user_message` to table `users` through the column `user_message.user_id`.
   */
  users_user_message_user_idTousers: OmitParentInputs<usersParentInputs<[...TPath, "users_user_message_user_idTousers"]>, "user_message_user_message_user_idTousers", [...TPath, "users_user_message_user_idTousers"]>;
  /**
   * Relationship from table `user_message` to table `workspace` through the column `user_message.workspace_id`.
   */
  workspace: OmitParentInputs<workspaceParentInputs<[...TPath, "workspace"]>, "user_message", [...TPath, "workspace"]>;
};
type user_messageChildrenInputs<TPath extends string[]> = {

};
type user_messageInputs<TPath extends string[]> = Inputs<
  user_messageScalars,
  user_messageParentsInputs<TPath>,
  user_messageChildrenInputs<TPath>
>;
type user_messageChildInputs<TPath extends string[]> = ChildInputs<user_messageInputs<TPath>>;
type user_messageParentInputs<TPath extends string[]> = ParentInputs<
user_messageInputs<TPath>,
  TPath
>;
type usersScalars = {
  /**
   * Column `users.id`.
   */
  id?: string;
  /**
   * Column `users.name`.
   */
  name: string;
  /**
   * Column `users.email`.
   */
  email: string;
  /**
   * Column `users.display_name`.
   */
  display_name: string | null;
  /**
   * Column `users.bio`.
   */
  bio: string | null;
  /**
   * Column `users.phone_number`.
   */
  phone_number: string | null;
  /**
   * Column `users.timezone`.
   */
  timezone: string | null;
  /**
   * Column `users.created_at`.
   */
  created_at?: string;
  /**
   * Column `users.updated_at`.
   */
  updated_at?: string;
  /**
   * Column `users.last_seen`.
   */
  last_seen: string | null;
  /**
   * Column `users.password`.
   */
  password: string;
}
type usersParentsInputs<TPath extends string[]> = {

};
type usersChildrenInputs<TPath extends string[]> = {
  /**
  * Relationship from table `users` to table `channel_member` through the column `channel_member.user_id`.
  */
  channel_member: OmitChildInputs<channel_memberChildInputs<[...TPath, "channel_member"]>, "users" | "user_id">;
  /**
  * Relationship from table `users` to table `channel_thread_message` through the column `channel_thread_message.user_id`.
  */
  channel_thread_message: OmitChildInputs<channel_thread_messageChildInputs<[...TPath, "channel_thread_message"]>, "users" | "user_id">;
  /**
  * Relationship from table `users` to table `user_message` through the column `user_message.recipient_id`.
  */
  user_message_user_message_recipient_idTousers: OmitChildInputs<user_messageChildInputs<[...TPath, "user_message_user_message_recipient_idTousers"]>, "users_user_message_recipient_idTousers" | "recipient_id">;
  /**
  * Relationship from table `users` to table `user_message` through the column `user_message.user_id`.
  */
  user_message_user_message_user_idTousers: OmitChildInputs<user_messageChildInputs<[...TPath, "user_message_user_message_user_idTousers"]>, "users_user_message_user_idTousers" | "user_id">;
  /**
  * Relationship from table `users` to table `workspace` through the column `workspace.owner_id`.
  */
  workspace: OmitChildInputs<workspaceChildInputs<[...TPath, "workspace"]>, "users" | "owner_id">;
  /**
  * Relationship from table `users` to table `workspace_member` through the column `workspace_member.user_id`.
  */
  workspace_member: OmitChildInputs<workspace_memberChildInputs<[...TPath, "workspace_member"]>, "users" | "user_id">;
};
type usersInputs<TPath extends string[]> = Inputs<
  usersScalars,
  usersParentsInputs<TPath>,
  usersChildrenInputs<TPath>
>;
type usersChildInputs<TPath extends string[]> = ChildInputs<usersInputs<TPath>>;
type usersParentInputs<TPath extends string[]> = ParentInputs<
usersInputs<TPath>,
  TPath
>;
type workspaceScalars = {
  /**
   * Column `workspace.id`.
   */
  id: string;
  /**
   * Column `workspace.name`.
   */
  name: string;
  /**
   * Column `workspace.owner_id`.
   */
  owner_id: string;
  /**
   * Column `workspace.created_at`.
   */
  created_at?: string;
  /**
   * Column `workspace.updated_at`.
   */
  updated_at?: string;
  /**
   * Column `workspace.url_slug`.
   */
  url_slug: string;
}
type workspaceParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `workspace` to table `users` through the column `workspace.owner_id`.
   */
  users: OmitParentInputs<usersParentInputs<[...TPath, "users"]>, "workspace", [...TPath, "users"]>;
};
type workspaceChildrenInputs<TPath extends string[]> = {
  /**
  * Relationship from table `workspace` to table `channel` through the column `channel.workspace_id`.
  */
  channel: OmitChildInputs<channelChildInputs<[...TPath, "channel"]>, "workspace" | "workspace_id">;
  /**
  * Relationship from table `workspace` to table `user_message` through the column `user_message.workspace_id`.
  */
  user_message: OmitChildInputs<user_messageChildInputs<[...TPath, "user_message"]>, "workspace" | "workspace_id">;
  /**
  * Relationship from table `workspace` to table `workspace_member` through the column `workspace_member.workspace_id`.
  */
  workspace_member: OmitChildInputs<workspace_memberChildInputs<[...TPath, "workspace_member"]>, "workspace" | "workspace_id">;
};
type workspaceInputs<TPath extends string[]> = Inputs<
  workspaceScalars,
  workspaceParentsInputs<TPath>,
  workspaceChildrenInputs<TPath>
>;
type workspaceChildInputs<TPath extends string[]> = ChildInputs<workspaceInputs<TPath>>;
type workspaceParentInputs<TPath extends string[]> = ParentInputs<
workspaceInputs<TPath>,
  TPath
>;
type workspace_memberScalars = {
  /**
   * Column `workspace_member.user_id`.
   */
  user_id: string;
  /**
   * Column `workspace_member.workspace_id`.
   */
  workspace_id: string;
  /**
   * Column `workspace_member.created_at`.
   */
  created_at?: string;
  /**
   * Column `workspace_member.updated_at`.
   */
  updated_at?: string;
  /**
   * Column `workspace_member.type`.
   */
  type?: string;
}
type workspace_memberParentsInputs<TPath extends string[]> = {
  /**
   * Relationship from table `workspace_member` to table `users` through the column `workspace_member.user_id`.
   */
  users: OmitParentInputs<usersParentInputs<[...TPath, "users"]>, "workspace_member", [...TPath, "users"]>;
  /**
   * Relationship from table `workspace_member` to table `workspace` through the column `workspace_member.workspace_id`.
   */
  workspace: OmitParentInputs<workspaceParentInputs<[...TPath, "workspace"]>, "workspace_member", [...TPath, "workspace"]>;
  /**
   * Relationship from table `workspace_member` to table `workspace_user_type` through the column `workspace_member.type`.
   */
  workspace_user_type: OmitParentInputs<workspace_user_typeParentInputs<[...TPath, "workspace_user_type"]>, "workspace_member", [...TPath, "workspace_user_type"]>;
};
type workspace_memberChildrenInputs<TPath extends string[]> = {

};
type workspace_memberInputs<TPath extends string[]> = Inputs<
  workspace_memberScalars,
  workspace_memberParentsInputs<TPath>,
  workspace_memberChildrenInputs<TPath>
>;
type workspace_memberChildInputs<TPath extends string[]> = ChildInputs<workspace_memberInputs<TPath>>;
type workspace_memberParentInputs<TPath extends string[]> = ParentInputs<
workspace_memberInputs<TPath>,
  TPath
>;
type workspace_user_typeScalars = {
  /**
   * Column `workspace_user_type.type`.
   */
  type: string;
}
type workspace_user_typeParentsInputs<TPath extends string[]> = {

};
type workspace_user_typeChildrenInputs<TPath extends string[]> = {
  /**
  * Relationship from table `workspace_user_type` to table `workspace_member` through the column `workspace_member.type`.
  */
  workspace_member: OmitChildInputs<workspace_memberChildInputs<[...TPath, "workspace_member"]>, "workspace_user_type" | "type">;
};
type workspace_user_typeInputs<TPath extends string[]> = Inputs<
  workspace_user_typeScalars,
  workspace_user_typeParentsInputs<TPath>,
  workspace_user_typeChildrenInputs<TPath>
>;
type workspace_user_typeChildInputs<TPath extends string[]> = ChildInputs<workspace_user_typeInputs<TPath>>;
type workspace_user_typeParentInputs<TPath extends string[]> = ParentInputs<
workspace_user_typeInputs<TPath>,
  TPath
>;
type channelParentsGraph = {
 workspace: OmitChildGraph<workspaceGraph, "channel">;
};
type channelChildrenGraph = {
 channel_member: OmitParentGraph<channel_memberGraph, "channel">;
 channel_thread: OmitParentGraph<channel_threadGraph, "channel">;
};
type channelGraph = Array<{
  Scalars: channelScalars;
  Parents: channelParentsGraph;
  Children: channelChildrenGraph;
}>;
type channel_memberParentsGraph = {
 channel: OmitChildGraph<channelGraph, "channel_member">;
 users: OmitChildGraph<usersGraph, "channel_member">;
};
type channel_memberChildrenGraph = {

};
type channel_memberGraph = Array<{
  Scalars: channel_memberScalars;
  Parents: channel_memberParentsGraph;
  Children: channel_memberChildrenGraph;
}>;
type channel_threadParentsGraph = {
 channel: OmitChildGraph<channelGraph, "channel_thread">;
};
type channel_threadChildrenGraph = {
 channel_thread_message: OmitParentGraph<channel_thread_messageGraph, "channel_thread">;
};
type channel_threadGraph = Array<{
  Scalars: channel_threadScalars;
  Parents: channel_threadParentsGraph;
  Children: channel_threadChildrenGraph;
}>;
type channel_thread_messageParentsGraph = {
 channel_thread: OmitChildGraph<channel_threadGraph, "channel_thread_message">;
 users: OmitChildGraph<usersGraph, "channel_thread_message">;
};
type channel_thread_messageChildrenGraph = {

};
type channel_thread_messageGraph = Array<{
  Scalars: channel_thread_messageScalars;
  Parents: channel_thread_messageParentsGraph;
  Children: channel_thread_messageChildrenGraph;
}>;
type user_messageParentsGraph = {
 users_user_message_recipient_idTousers: OmitChildGraph<usersGraph, "user_message_user_message_recipient_idTousers">;
 users_user_message_user_idTousers: OmitChildGraph<usersGraph, "user_message_user_message_user_idTousers">;
 workspace: OmitChildGraph<workspaceGraph, "user_message">;
};
type user_messageChildrenGraph = {

};
type user_messageGraph = Array<{
  Scalars: user_messageScalars;
  Parents: user_messageParentsGraph;
  Children: user_messageChildrenGraph;
}>;
type usersParentsGraph = {

};
type usersChildrenGraph = {
 channel_member: OmitParentGraph<channel_memberGraph, "users">;
 channel_thread_message: OmitParentGraph<channel_thread_messageGraph, "users">;
 user_message_user_message_recipient_idTousers: OmitParentGraph<user_messageGraph, "users_user_message_recipient_idTousers">;
 user_message_user_message_user_idTousers: OmitParentGraph<user_messageGraph, "users_user_message_user_idTousers">;
 workspace: OmitParentGraph<workspaceGraph, "users">;
 workspace_member: OmitParentGraph<workspace_memberGraph, "users">;
};
type usersGraph = Array<{
  Scalars: usersScalars;
  Parents: usersParentsGraph;
  Children: usersChildrenGraph;
}>;
type workspaceParentsGraph = {
 users: OmitChildGraph<usersGraph, "workspace">;
};
type workspaceChildrenGraph = {
 channel: OmitParentGraph<channelGraph, "workspace">;
 user_message: OmitParentGraph<user_messageGraph, "workspace">;
 workspace_member: OmitParentGraph<workspace_memberGraph, "workspace">;
};
type workspaceGraph = Array<{
  Scalars: workspaceScalars;
  Parents: workspaceParentsGraph;
  Children: workspaceChildrenGraph;
}>;
type workspace_memberParentsGraph = {
 users: OmitChildGraph<usersGraph, "workspace_member">;
 workspace: OmitChildGraph<workspaceGraph, "workspace_member">;
 workspace_user_type: OmitChildGraph<workspace_user_typeGraph, "workspace_member">;
};
type workspace_memberChildrenGraph = {

};
type workspace_memberGraph = Array<{
  Scalars: workspace_memberScalars;
  Parents: workspace_memberParentsGraph;
  Children: workspace_memberChildrenGraph;
}>;
type workspace_user_typeParentsGraph = {

};
type workspace_user_typeChildrenGraph = {
 workspace_member: OmitParentGraph<workspace_memberGraph, "workspace_user_type">;
};
type workspace_user_typeGraph = Array<{
  Scalars: workspace_user_typeScalars;
  Parents: workspace_user_typeParentsGraph;
  Children: workspace_user_typeChildrenGraph;
}>;
type Graph = {
  channel: channelGraph;
  channel_member: channel_memberGraph;
  channel_thread: channel_threadGraph;
  channel_thread_message: channel_thread_messageGraph;
  user_message: user_messageGraph;
  users: usersGraph;
  workspace: workspaceGraph;
  workspace_member: workspace_memberGraph;
  workspace_user_type: workspace_user_typeGraph;
};
type ScalarField = {
  name: string;
  type: string;
};
type ObjectField = ScalarField & {
  relationFromFields: string[];
  relationToFields: string[];
};
type Inflection = {
  modelName?: (name: string) => string;
  scalarField?: (field: ScalarField) => string;
  parentField?: (field: ObjectField, oppositeBaseNameMap: Record<string, string>) => string;
  childField?: (field: ObjectField, oppositeField: ObjectField, oppositeBaseNameMap: Record<string, string>) => string;
  oppositeBaseNameMap?: Record<string, string>;
};
type Override = {
  channel?: {
    name?: string;
    fields?: {
      id?: string;
      name?: string;
      is_public?: string;
      workspace_id?: string;
      created_at?: string;
      updated_at?: string;
      created_by?: string;
      workspace?: string;
      channel_member?: string;
      channel_thread?: string;
    };
  }
  channel_member?: {
    name?: string;
    fields?: {
      id?: string;
      channel_id?: string;
      user_id?: string;
      created_at?: string;
      updated_at?: string;
      channel?: string;
      users?: string;
    };
  }
  channel_thread?: {
    name?: string;
    fields?: {
      id?: string;
      channel_id?: string;
      created_at?: string;
      updated_at?: string;
      channel?: string;
      channel_thread_message?: string;
    };
  }
  channel_thread_message?: {
    name?: string;
    fields?: {
      id?: string;
      user_id?: string;
      channel_thread_id?: string;
      message?: string;
      created_at?: string;
      updated_at?: string;
      channel_thread?: string;
      users?: string;
    };
  }
  user_message?: {
    name?: string;
    fields?: {
      id?: string;
      user_id?: string;
      recipient_id?: string;
      message?: string;
      created_at?: string;
      updated_at?: string;
      workspace_id?: string;
      users_user_message_recipient_idTousers?: string;
      users_user_message_user_idTousers?: string;
      workspace?: string;
    };
  }
  users?: {
    name?: string;
    fields?: {
      id?: string;
      name?: string;
      email?: string;
      display_name?: string;
      bio?: string;
      phone_number?: string;
      timezone?: string;
      created_at?: string;
      updated_at?: string;
      last_seen?: string;
      password?: string;
      channel_member?: string;
      channel_thread_message?: string;
      user_message_user_message_recipient_idTousers?: string;
      user_message_user_message_user_idTousers?: string;
      workspace?: string;
      workspace_member?: string;
    };
  }
  workspace?: {
    name?: string;
    fields?: {
      id?: string;
      name?: string;
      owner_id?: string;
      created_at?: string;
      updated_at?: string;
      url_slug?: string;
      users?: string;
      channel?: string;
      user_message?: string;
      workspace_member?: string;
    };
  }
  workspace_member?: {
    name?: string;
    fields?: {
      user_id?: string;
      workspace_id?: string;
      created_at?: string;
      updated_at?: string;
      type?: string;
      users?: string;
      workspace?: string;
      workspace_user_type?: string;
    };
  }
  workspace_user_type?: {
    name?: string;
    fields?: {
      type?: string;
      workspace_member?: string;
    };
  }}
export type Alias = {
  inflection?: Inflection | boolean;
  override?: Override;
};
export declare class SnapletClientBase {
  /**
   * Generate one or more `channel`.
   * @example With static inputs:
   * ```ts
   * snaplet.channel([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.channel((x) => x(3));
   * snaplet.channel((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.channel((x) => [{}, ...x(3), {}]);
   * ```
   */
  channel: (
    inputs: channelChildInputs<["channel"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `channel_member`.
   * @example With static inputs:
   * ```ts
   * snaplet.channel_member([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.channel_member((x) => x(3));
   * snaplet.channel_member((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.channel_member((x) => [{}, ...x(3), {}]);
   * ```
   */
  channel_member: (
    inputs: channel_memberChildInputs<["channel_member"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `channel_thread`.
   * @example With static inputs:
   * ```ts
   * snaplet.channel_thread([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.channel_thread((x) => x(3));
   * snaplet.channel_thread((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.channel_thread((x) => [{}, ...x(3), {}]);
   * ```
   */
  channel_thread: (
    inputs: channel_threadChildInputs<["channel_thread"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `channel_thread_message`.
   * @example With static inputs:
   * ```ts
   * snaplet.channel_thread_message([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.channel_thread_message((x) => x(3));
   * snaplet.channel_thread_message((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.channel_thread_message((x) => [{}, ...x(3), {}]);
   * ```
   */
  channel_thread_message: (
    inputs: channel_thread_messageChildInputs<["channel_thread_message"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `user_message`.
   * @example With static inputs:
   * ```ts
   * snaplet.user_message([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.user_message((x) => x(3));
   * snaplet.user_message((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.user_message((x) => [{}, ...x(3), {}]);
   * ```
   */
  user_message: (
    inputs: user_messageChildInputs<["user_message"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `users`.
   * @example With static inputs:
   * ```ts
   * snaplet.users([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.users((x) => x(3));
   * snaplet.users((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.users((x) => [{}, ...x(3), {}]);
   * ```
   */
  users: (
    inputs: usersChildInputs<["users"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `workspace`.
   * @example With static inputs:
   * ```ts
   * snaplet.workspace([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.workspace((x) => x(3));
   * snaplet.workspace((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.workspace((x) => [{}, ...x(3), {}]);
   * ```
   */
  workspace: (
    inputs: workspaceChildInputs<["workspace"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `workspace_member`.
   * @example With static inputs:
   * ```ts
   * snaplet.workspace_member([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.workspace_member((x) => x(3));
   * snaplet.workspace_member((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.workspace_member((x) => [{}, ...x(3), {}]);
   * ```
   */
  workspace_member: (
    inputs: workspace_memberChildInputs<["workspace_member"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Generate one or more `workspace_user_type`.
   * @example With static inputs:
   * ```ts
   * snaplet.workspace_user_type([{}, {}]);
   * ```
   * @example Using the `x` helper:
   * ```ts
   * snaplet.workspace_user_type((x) => x(3));
   * snaplet.workspace_user_type((x) => x({ min: 1, max: 10 }));
   * ```
   * @example Mixing both:
   * ```ts
   * snaplet.workspace_user_type((x) => [{}, ...x(3), {}]);
   * ```
   */
  workspace_user_type: (
    inputs: workspace_user_typeChildInputs<["workspace_user_type"]>,
    options?: PlanOptions,
  ) => Plan;
  /**
   * Compose multiple plans together, injecting the store of the previous plan into the next plan.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#using-pipe | documentation}.
   */
  $pipe: Pipe;
  /**
   * Compose multiple plans together, without injecting the store of the previous plan into the next plan.
   * All stores stay independent and are merged together once all the plans are generated.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#using-merge | documentation}.
   */
  $merge: Merge;
  /**
   * Create a store instance.
   *
   * Learn more in the {@link https://docs.snaplet.dev/core-concepts/generate#augmenting-external-data-with-createstore | documentation}.
   */
  $createStore: CreateStore;
};

export type SnapletClientBaseOptions = {
  userModels?: UserModels
}


type PgClient = {
  query(string): Promise<unknown>
}

export declare class SnapletClient extends SnapletClientBase {
  constructor(pgClient: PgClient, options?: SnapletClientBaseOptions)
}