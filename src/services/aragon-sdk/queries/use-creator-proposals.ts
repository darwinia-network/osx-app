import {gql} from 'graphql-request';
import {UseQueryOptions, useQuery} from '@tanstack/react-query';
import {aragonSdkQueryKeys} from '../query-keys';
import type {IFetchCreatorProposalsParams} from '../aragon-sdk-service.api';
import {
  MultisigProposal,
  ProposalSortBy,
  TokenVotingProposal,
} from '@aragon/sdk-client';
import {invariant} from 'utils/invariant';
import {useNetwork} from 'context/network';
import {ProposalBase, SortDirection} from '@aragon/sdk-client-common';
import {
  GaslessPluginName,
  PluginClient,
  usePluginClient,
} from 'hooks/usePluginClient';
import {
  GaslessVotingClient,
  GaslessVotingProposal,
} from '@vocdoni/gasless-voting';
import {SupportedNetworks} from 'utils/constants';

import {getProposal} from 'services/aragon-sdk/queries/use-proposal';

type Proposal = MultisigProposal | TokenVotingProposal | GaslessVotingProposal;

export const tokenVotingProposalsQuery = gql`
  query TokenVotingProposals(
    $where: TokenVotingProposal_filter!
    $block: Block_height
    $direction: OrderDirection!
    $sortBy: TokenVotingProposal_orderBy!
  ) {
    tokenVotingProposals(
      where: $where
      block: $block
      orderDirection: $direction
      orderBy: $sortBy
    ) {
      id
    }
  }
`;

export const multisigProposalsQuery = gql`
  query MultisigProposals(
    $where: MultisigProposal_filter!
    $block: Block_height
    $direction: OrderDirection!
    $sortBy: MultisigProposal_orderBy!
  ) {
    multisigProposals(
      where: $where
      block: $block
      orderDirection: $direction
      orderBy: $sortBy
    ) {
      id
    }
  }
`;

const fetchCreatorGaslessProposals = async (
  {pluginAddress, address, blockNumber}: IFetchCreatorProposalsParams,
  client?: PluginClient,
  network?: SupportedNetworks
): Promise<Proposal[]> => {
  invariant(client != null, 'fetchCreatorProposals: client is not defined');

  const resultProposalsIds = await (
    client as GaslessVotingClient
  ).methods.getMemberProposals(
    pluginAddress,
    address,
    blockNumber ?? 0,
    SortDirection.DESC,
    ProposalSortBy.CREATED_AT
  );

  const proposalQueriesPromises = resultProposalsIds.map((id: string) =>
    getProposal(client, id, network as SupportedNetworks)
  );

  const resultsProposals = await Promise.all(proposalQueriesPromises);

  return resultsProposals.filter(item => !!item) as Proposal[];
};

const fetchCreatorProposals = async (
  {
    pluginAddress,
    address,
    pluginType,
    blockNumber,
  }: IFetchCreatorProposalsParams,
  client?: PluginClient,
  network?: SupportedNetworks
): Promise<Proposal[]> => {
  invariant(client != null, 'fetchCreatorProposals: client is not defined');

  const params = {
    where: {
      plugin: pluginAddress.toLowerCase(),
      creator: address.toLowerCase(),
    },
    block: blockNumber ? {number: blockNumber} : null,
    direction: SortDirection.DESC,
    sortBy: ProposalSortBy.CREATED_AT,
  };

  type TResult = {
    tokenVotingProposals?: Array<{id: string}>;
    multisigProposals?: Array<{id: string}>;
  };

  const executedQuery =
    pluginType === 'multisig.plugin.ring-dao.eth'
      ? multisigProposalsQuery
      : tokenVotingProposalsQuery;

  const response = await client.graphql.request<TResult>({
    query: executedQuery,
    params,
  });

  const resultProposalsIds =
    (pluginType === 'multisig.plugin.ring-dao.eth'
      ? response.multisigProposals
      : response.tokenVotingProposals) || [];

  const proposalQueriesPromises = resultProposalsIds.map(item =>
    getProposal(client, item.id, network as SupportedNetworks)
  );

  const resultsProposals = await Promise.all(proposalQueriesPromises);

  return resultsProposals.filter(item => !!item) as Proposal[];
};

export const useCreatorProposals = (
  params: IFetchCreatorProposalsParams,
  options: Omit<UseQueryOptions<ProposalBase[]>, 'queryKey'> = {}
) => {
  const client = usePluginClient(params.pluginType);
  const {network} = useNetwork();
  const baseParams = {
    network: network,
  };

  if (!client || !params.pluginType) {
    options.enabled = false;
  }

  return useQuery({
    queryKey: aragonSdkQueryKeys.getCreatorProposals(baseParams, params),
    queryFn: () =>
      params.pluginType === GaslessPluginName
        ? fetchCreatorGaslessProposals(params, client, network)
        : fetchCreatorProposals(params, client, network),
    ...options,
  });
};
