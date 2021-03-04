import { constants } from 'ethers'
import { waffle, ethers } from 'hardhat'

import { Fixture } from 'ethereum-waffle'
import { MockTimeUniswapV3Router01, TestERC20, WETH10, WETH9 } from '../typechain'
import { expect } from 'chai'
import { getPermitSignature } from './shared/permit'
import { v3CoreFactoryFixture } from './shared/fixtures'

describe('SelfPermit', () => {
  const wallets = waffle.provider.getWallets()
  const [wallet, other] = wallets

  const fixture: Fixture<{
    token: TestERC20
    router: MockTimeUniswapV3Router01
  }> = async (wallets, provider) => {
    const factory = await ethers.getContractFactory('TestERC20')
    const token = (await factory.deploy(constants.MaxUint256.div(2))) as TestERC20

    const weth9Factory = await ethers.getContractFactory('WETH9')
    const weth9 = (await weth9Factory.deploy()) as WETH9

    const weth10Factory = await ethers.getContractFactory('WETH10')
    const weth10 = (await weth10Factory.deploy()) as WETH10

    const routerFactory = await ethers.getContractFactory('MockTimeUniswapV3Router01')
    const { factory: v3CoreFactory } = await v3CoreFactoryFixture(wallets, provider)
    const router = (await routerFactory.deploy(
      v3CoreFactory.address,
      weth9.address,
      weth10.address
    )) as MockTimeUniswapV3Router01

    return {
      token,
      router,
    }
  }

  let token: TestERC20
  let router: MockTimeUniswapV3Router01

  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before('create fixture loader', async () => {
    loadFixture = waffle.createFixtureLoader(wallets)
  })

  beforeEach('load fixture', async () => {
    ;({ token, router } = await loadFixture(fixture))
  })

  it('permit works', async () => {
    const value = 123

    const { v, r, s } = await getPermitSignature(wallet, token, other.address, value)

    expect(await token.allowance(wallet.address, other.address)).to.be.eq(0)
    await token.permit(wallet.address, other.address, value, constants.MaxUint256, v, r, s)
    expect(await token.allowance(wallet.address, other.address)).to.be.eq(value)
  })

  it('permit works via the router', async () => {
    const value = 456

    const { v, r, s } = await getPermitSignature(wallet, token, router.address, value)

    expect(await token.allowance(wallet.address, router.address)).to.be.eq(0)
    await router.selfPermit(token.address, value, constants.MaxUint256, v, r, s)
    expect(await token.allowance(wallet.address, router.address)).to.be.eq(value)
  })
})
