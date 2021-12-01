import React from 'react';
import { Meta, Story } from '@storybook/react';
import { TokenCard, TokenCardProps } from '../src';

export default {
  title: 'Components/Token',
  component: TokenCard,
} as Meta;

const Template:Story<TokenCardProps> = args => <TokenCard {...args} />;

export const Default = Template.bind({});
Default.args = {
  tokenName: 'DAI',
  tokenSymbolURL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
  treasurySharePercentage: '45%',
  tokenCount: '15,000,230.2323',
  tokenUSDValue: '$1',
  treasuryShare: '$15,000,230.2323',
  changeDuringInterval: '+$150,002.3',
  percentageChangeDuringInterval: '+ 0.01%',
};