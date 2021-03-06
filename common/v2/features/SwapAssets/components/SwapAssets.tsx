import React, { useEffect } from 'react';
import styled from 'styled-components';
import { formatEther } from 'ethers/utils';
import { Button, Tooltip } from '@mycrypto/ui';

import translate, { translateRaw } from 'v2/translations';
import { MYC_DEXAG_COMMISSION_RATE, MYC_DEXAG_MARKUP_THRESHOLD } from 'v2/config';
import { InputField, AssetDropdown } from 'v2/components';
import { SPACING, COLORS } from 'v2/theme';
import { subtractBNFloats, trimBN } from 'v2/utils';

import { ISwapAsset } from '../types';
import { getUnselectedAssets } from '../helpers';
import questionToolTip from 'common/assets/images/icn-question.svg';

const FormWrapper = styled.div`
  margin-top: 20px;
  margin-bottom: 16px;
`;

const FormItem = styled.div`
  display: flex;
  width: 100%;
`;

const InputWrapper = styled.div`
  width: 100%;
  margin-right: 15px;
`;

const LabelText = styled.p`
  display: flex;
`;

const STooltip = styled(Tooltip)`
  display: flex;
`;

const Label = styled.div`
  font-size: 18px;
  display: flex;
  flex-direction: row;
  line-height: 1;
  text-align: left;
  font-weight: normal;
  margin-bottom: 9px;
  color: ${props => props.theme.text};
  & img {
    margin: 0em 0.2em;
  }
`;

const DisplayDataContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StyledButton = styled(Button)`
  margin-top: 12px;
  width: 100%;
`;

const SlippageDisplay = styled(LabelText)`
  color: ${props => props.color};
`;

const FormDisplay = styled.div`
  margin-bottom: ${SPACING.SM};
`;

interface Props {
  fromAmount: string;
  toAmount: string;
  fromAsset: ISwapAsset;
  toAsset: ISwapAsset;
  assets: ISwapAsset[];
  isCalculatingFromAmount: boolean;
  isCalculatingToAmount: boolean;
  fromAmountError: string;
  toAmountError: string;
  initialToAmount: string;
  exchangeRate: string;
  markup: string;
  onSuccess(): void;
  handleFromAssetSelected(asset: ISwapAsset): void;
  handleToAssetSelected(asset: ISwapAsset): void;
  calculateNewFromAmount(value: string): Promise<void>;
  calculateNewToAmount(value: string): Promise<void>;
  handleFromAmountChanged(value: string): void;
  handleToAmountChanged(value: string): void;
}

let calculateToAmountTimeout: ReturnType<typeof setTimeout> | null = null;
let calculateFromAmountTimeout: ReturnType<typeof setTimeout> | null = null;

export default function SwapAssets(props: Props) {
  const {
    fromAmount,
    toAmount,
    fromAsset,
    toAsset,
    assets,
    isCalculatingFromAmount,
    isCalculatingToAmount,
    fromAmountError,
    toAmountError,
    onSuccess,
    handleFromAssetSelected,
    handleToAssetSelected,
    calculateNewFromAmount,
    calculateNewToAmount,
    handleFromAmountChanged,
    handleToAmountChanged,
    initialToAmount,
    exchangeRate,
    markup
  } = props;

  // show only unused assets
  const filteredAssets = getUnselectedAssets(assets, fromAsset, toAsset);

  // SEND AMOUNT CHANGED
  const handleFromAmountChangedEvent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    handleFromAmountChanged(value);

    // Calculate new "to amount" 500 ms after user stopped typing
    if (calculateToAmountTimeout) clearTimeout(calculateToAmountTimeout);

    calculateToAmountTimeout = setTimeout(() => {
      calculateNewToAmount(value);
    }, 500);
  };

  // RECEIVE AMOUNT CHANGED
  const handleToAmountChangedEvent = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    handleToAmountChanged(value);

    // Calculate new "from amount" 500 ms after user stopped typing
    if (calculateFromAmountTimeout) clearTimeout(calculateFromAmountTimeout);
    calculateFromAmountTimeout = setTimeout(() => {
      calculateNewFromAmount(value);
    }, 500);
  };

  // Calculate new "to amount" after "to asset" is selected
  useEffect(() => {
    if (!fromAmount) {
      return;
    }

    calculateNewToAmount(fromAmount);
  }, [toAsset]);

  const makeDisplayString = (amount: string) =>
    parseFloat(trimBN(amount, 10)) <= 0.01
      ? '<0.01'
      : `~ ${parseFloat(trimBN(amount, 10)).toFixed(2)}`;

  return (
    <FormWrapper>
      <FormItem>
        <InputWrapper>
          <InputField
            label={translateRaw('SWAP_SEND_AMOUNT')}
            value={fromAmount}
            placeholder="0.00"
            onChange={handleFromAmountChangedEvent}
            height={'54px'}
            isLoading={isCalculatingFromAmount}
            inputError={fromAmountError}
          />
        </InputWrapper>
        <AssetDropdown
          selectedAsset={fromAsset}
          assets={filteredAssets}
          label={translateRaw('X_ASSET')}
          onSelect={handleFromAssetSelected}
          showOnlyTicker={true}
          disabled={isCalculatingToAmount || isCalculatingFromAmount}
          searchable={true}
        />
      </FormItem>
      <FormItem>
        <InputWrapper>
          <InputField
            label={translateRaw('SWAP_RECEIVE_AMOUNT')}
            value={toAmount}
            placeholder="0.00"
            onChange={handleToAmountChangedEvent}
            height={'54px'}
            isLoading={isCalculatingToAmount}
            inputError={toAmountError}
          />
        </InputWrapper>
        <AssetDropdown
          selectedAsset={toAsset}
          assets={filteredAssets}
          label={translateRaw('ASSET')}
          onSelect={handleToAssetSelected}
          showOnlyTicker={true}
          disabled={isCalculatingToAmount || isCalculatingFromAmount}
          searchable={true}
        />
      </FormItem>
      <FormDisplay>
        {exchangeRate && toAsset && fromAsset && (
          <DisplayDataContainer>
            <Label>{translateRaw('SWAP_RATE_LABEL')}</Label>
            <LabelText>
              {translateRaw('SWAP_RATE_TEXT', {
                $displayString: makeDisplayString(exchangeRate.toString()),
                $toAssetSymbol: toAsset.symbol,
                $fromAssetSymbol: fromAsset.symbol
              })}
            </LabelText>
          </DisplayDataContainer>
        )}
        {initialToAmount && toAmount && toAsset && (
          <DisplayDataContainer>
            <Label>
              <LabelText>
                {translateRaw('SWAP_FEE_LABEL', {
                  $commission: MYC_DEXAG_COMMISSION_RATE.toString()
                })}
              </LabelText>
              <STooltip tooltip={translateRaw('SWAP_FEE_TOOLTIP')}>
                <img src={questionToolTip} />
              </STooltip>
              :
            </Label>
            <LabelText>
              {`${makeDisplayString(
                formatEther(subtractBNFloats(initialToAmount, toAmount).toString())
              )} ${toAsset.symbol}`}
            </LabelText>
          </DisplayDataContainer>
        )}
        {markup && fromAsset && (
          <DisplayDataContainer>
            <Label>
              <LabelText>{translateRaw('SWAP_MARKUP_LABEL')}</LabelText>
              <STooltip tooltip={translateRaw('SWAP_MARKUP_TOOLTIP')}>
                <img src={questionToolTip} />
              </STooltip>
              :
            </Label>
            <SlippageDisplay
              color={parseFloat(markup) >= MYC_DEXAG_MARKUP_THRESHOLD ? COLORS.RED : COLORS.GREEN}
            >
              {`${makeDisplayString(markup.toString())}%`}
            </SlippageDisplay>
          </DisplayDataContainer>
        )}
      </FormDisplay>
      <StyledButton
        onClick={onSuccess}
        disabled={
          isCalculatingToAmount ||
          isCalculatingFromAmount ||
          !fromAmount ||
          !toAmount ||
          !!fromAmountError ||
          !!toAmountError
        }
      >
        {translate('ACTION_6')}
      </StyledButton>
    </FormWrapper>
  );
}
