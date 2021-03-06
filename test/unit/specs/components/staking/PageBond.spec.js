import setup from '../../../helpers/vuex-setup'
import htmlBeautify from 'html-beautify'
import Vuelidate from 'vuelidate'
import PageBond from 'renderer/components/staking/PageBond'

describe('PageBond', () => {
  let wrapper, store, router
  let {mount, localVue} = setup()
  localVue.use(Vuelidate)

  beforeEach(() => {
    let test = mount(PageBond)
    store = test.store
    router = test.router
    wrapper = test.wrapper

    store.commit('setAtoms', 101)

    store.commit('addToCart', {
      id: 'pubkeyX',
      pub_key: {
        type: 'ed25519',
        data: 'pubkeyX'
      },
      voting_power: 10000,
      shares: 5000,
      description: {
        description: 'descriptionX',
        country: 'USA',
        moniker: 'someValidator'
      }
    })
    store.commit('addToCart', {
      id: 'pubkeyY',
      pub_key: {
        type: 'ed25519',
        data: 'pubkeyY'
      },
      voting_power: 30000,
      shares: 10000,
      description: {
        description: 'descriptionY',
        country: 'Canada',
        moniker: 'someOtherValidator'
      }
    })

    wrapper.update()
  })

  it('has the expected html structure', () => {
    expect(wrapper.vm.$el).toMatchSnapshot()
  })

  it('should return to the candidates if desired', () => {
    wrapper.find('.ni-tool-bar a').trigger('click')
    expect(router.currentRoute.fullPath).toBe('/staking')
  })

  it('shows selected candidates', () => {
    expect(htmlBeautify(wrapper.html())).toContain('someValidator')
    expect(htmlBeautify(wrapper.html())).toContain('someOtherValidator')
  })

  it('should allow removal of candidates', () => {
    global.confirm = jest.fn()
    global.confirm.mockReturnValue(true)
    expect(wrapper.vm.fields.delegates.length).toBe(2)
    wrapper.findAll('button.remove').at(0).trigger('click')
    expect(wrapper.vm.fields.delegates.length).toBe(1)

    expect(global.confirm).toHaveBeenCalled()
    expect(htmlBeautify(wrapper.html())).not.toContain('someValidator')
    expect(htmlBeautify(wrapper.html())).toContain('someOtherValidator')
  })

  it('should equally split atoms if desired', () => {
    wrapper.findAll('button.equalize').trigger('click')
    expect(wrapper.vm.fields.delegates[0].atoms).toBe(51)
    expect(wrapper.vm.fields.delegates[1].atoms).toBe(50)
  })

  it('should show an error when bonding too many atoms', () => {
    wrapper.setData({
      fields: {
        delegates: [
          {
            id: 'pubkeyX',
            delegate: store.getters.shoppingCart[0].delegate,
            atoms: 100
          },
          {
            id: 'pubkeyY',
            delegate: store.getters.shoppingCart[1].delegate,
            atoms: 100
          }
        ]
      }
    })
    wrapper.findAll('button.bond').trigger('click')
    expect(store.dispatch.mock.calls[0]).toBeUndefined()
    expect(wrapper.find('.ni-form-msg-error')).toBeDefined()
  })

  it('should bond atoms on submit', () => {
    wrapper.setData({
      fields: {
        delegates: [
          {
            id: 'pubkeyX',
            delegate: store.getters.shoppingCart[0].delegate,
            atoms: 51
          },
          {
            id: 'pubkeyY',
            delegate: store.getters.shoppingCart[1].delegate,
            atoms: 50
          }
        ]
      }
    })
    expect(htmlBeautify(wrapper.html())).not.toContain('This action will unbond')
    wrapper.findAll('button.bond').trigger('click')
    expect(store.dispatch.mock.calls[0][0]).toBe('submitDelegation')
  })

  it('should unbond atoms if bond amount is decreased', () => {
    store.commit('setCommittedDelegation', {
      candidateId: 'pubkeyX',
      value: 51
    })
    store.commit('setCommittedDelegation', {
      candidateId: 'pubkeyY',
      value: 50
    })
    wrapper.update()
    wrapper.setData({
      fields: {
        delegates: [
          {
            id: 'pubkeyX',
            delegate: store.getters.shoppingCart[0].delegate,
            atoms: 0
          },
          {
            id: 'pubkeyY',
            delegate: store.getters.shoppingCart[1].delegate,
            atoms: 25
          }
        ]
      }
    })

    expect(htmlBeautify(wrapper.html())).toContain('This action will unbond')

    wrapper.findAll('button.bond').trigger('click')
    expect(store.dispatch.mock.calls[0][0]).toBe('submitDelegation')
  })
})
