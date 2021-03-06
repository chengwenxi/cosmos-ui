<template lang="pug">
page.page-bond(title="Bond Atoms")
  div(slot="menu"): tool-bar
    router-link(to='/staking')
      i.material-icons arrow_back
      .label Back

  part(title="Your Atoms")
    list-item(
      dt="Total Atoms"
      :dd="totalAtoms")
    list-item(
      dt="Total Bonded Atoms"
      :dd="committedBondedAtoms || 0")
    list-item(
      dt="Total Unbonded Atoms"
      :dd="totalUnbondedAtoms || 0")

  part(title='Selected Delegates')
    form-struct(:submit="onSubmit")
      div.alloc-action-container
        btn.equalize(value="Split Allocation Equally" type="button" @click.native="equalAlloc")
        btn.reserved-atoms__restart(value="Reset Allocation " type="button" @click.native="resetAlloc")

      form-group(
        v-for='(delegate, index) in fields.delegates'
        :key='delegate.id'
        :error='$v.fields.delegates.$each[index].$error'
        :field-label='delegate.delegate.description.moniker'
        :sub-label="'Previously bonded ' + (committedDelegations[delegate.delegate.id] || 0) + ' Atoms'"
        field-id='delegate-field')
        field-group
          field(
            type="number"
            step="any"
            placeholder="Atoms"
            v-model.number="delegate.atoms")
          field-addon Atoms
          btn.remove(type="button" icon="clear" @click.native="rm(delegate.id)")
        form-msg(name="Atoms" type="required"
          v-if="!$v.fields.delegates.$each[index].atoms.required")
        form-msg(name="Atoms" type="numeric"
          v-if="!$v.fields.delegates.$each[index].atoms.numeric")
        form-msg(name="Atoms" type="between" :min="atomsMin" :max="user.atoms"
          v-if="!$v.fields.delegates.$each[index].atoms.between")

      ul.reserved-atoms
        li(v-if="uncommittedBondedAtoms > 0 && !(unbondedAtoms < 0)")
          | This action will bond #[.reserved-atoms__number {{ uncommittedBondedAtoms }}] Atoms to the specified delegates.
        li.reserved-atoms--error(v-if="unbondedAtoms === 0")
          | This action will bond all of your #[.reserved-atoms__number {{ uncommittedBondedAtoms }}] Atoms to the specified delegates.
        li(v-if="willUnbondAtoms > 0")
          | This action will unbond #[.reserved-atoms__number {{ willUnbondAtoms }}] Atoms from the specified delegates.
        li.reserved-atoms--error(v-if="unbondedAtoms < 0")
          | You cannot bond #[.reserved-atoms__number {{ unbondedAtoms * -1 }}] more Atoms than you have.
        li.reserved-atoms--warning The unbonding period is <b>30</b> days.

      div.submit-container
        span
        btn.bond.btn__primary(value="Submit")
</template>

<script>
import { between, numeric, required } from 'vuelidate/lib/validators'
import { mapGetters } from 'vuex'
import Btn from '@nylira/vue-button'
import Field from '@nylira/vue-field'
import FieldAddon from 'common/NiFieldAddon'
import FieldGroup from 'common/NiFieldGroup'
import FormGroup from 'common/NiFormGroup'
import FormMsg from 'common/NiFormMsg'
import FormStruct from 'common/NiFormStruct'
import ListItem from 'common/NiListItem'
import Page from 'common/NiPage'
import Part from 'common/NiPart'
import ToolBar from 'common/NiToolBar'
export default {
  name: 'page-bond',
  components: {
    Btn,
    Field,
    FieldAddon,
    FieldGroup,
    FormGroup,
    FormMsg,
    FormStruct,
    ListItem,
    Page,
    Part,
    ToolBar
  },
  computed: {
    ...mapGetters(['shoppingCart', 'user', 'committedDelegations']),
    committedBondedAtoms () {
      return Object.values(this.committedDelegations).reduce((sum, d) => sum + d, 0)
    },
    willUnbondAtoms () {
      let sum = 0
      /* eslint-disable no-unused-vars */
      for (let [k, selectedDelegate] of this.fields.delegates.entries()) {
        // set previously committed delegations for each delegate in cart
        let previouslyCommitted = this.committedDelegations[selectedDelegate.id]

        // check to see if user has allocated any atoms in cart
        let currentlyAllocatedAtoms = selectedDelegate ? selectedDelegate.atoms : 0

        // amount user intends to unbond from each delegate in cart
        let unbondAmount = Math.max(previouslyCommitted - currentlyAllocatedAtoms, 0)

        // set NaN's to 0
        unbondAmount = unbondAmount || 0

        // total amount user intends to unbond from all delegates in cart
        sum += unbondAmount
      }
      return sum
    },
    unbondedAtoms () {
      let willBondSum = this.uncommittedBondedAtoms
      let bondedSum = this.committedBondedAtoms
      return this.totalAtoms - willBondSum + bondedSum - this.willUnbondAtoms
    },
    unbondedAtomsPct () {
      return Math.round(this.unbondedAtoms / this.totalAtoms * 100 * 10) / 10 + '%'
    },
    uncommittedBondedAtoms () {
      return this.fields.delegates.reduce((sum, d) => sum + (d.atoms || 0), 0)
    },
    bondedAtomsPct () {
      return Math.round(this.committedBondedAtoms / this.totalAtoms * 100 * 10) / 10 + '%'
    },
    totalAtoms () {
      return this.user.atoms
    },
    totalUnbondedAtoms () {
      return this.totalAtoms - this.committedBondedAtoms
    }
  },
  data: () => ({
    equalize: false,
    atomsMin: 0,
    fields: {
      delegates: []
    }
  }),
  methods: {
    equalAlloc () {
      this.equalize = true
      this.resetAlloc()
      let atoms = this.unbondedAtoms
      let delegates = this.fields.delegates.length
      let remainderAtoms = atoms % delegates

      // give equal atoms to every delegate
      this.fields.delegates.forEach(c => (c.atoms += Math.floor(atoms / delegates)))

      // give remainder atoms
      for (let i = 0; i < remainderAtoms; i++) {
        this.fields.delegates[i].atoms += 1
      }
    },
    percentAtoms (uncommittedBondedAtoms) {
      return Math.round(uncommittedBondedAtoms / this.user.atoms * 100 * 100) / 100 + '%'
    },
    async onSubmit () {
      if (this.unbondedAtoms < 0) {
        this.$store.commit('notifyError', { title: 'Too Many Allocated Atoms',
          body: `You've tried to bond ${this.unbondedAtoms * -1} more atoms than you have.`})
        return
      }
      this.$v.$touch()
      if (!this.$v.$error) {
        this.$store.commit('activateDelegation')
        try {
          await this.$store.dispatch('submitDelegation', this.fields)
          this.$store.commit('notify', { title: 'Atoms Bonded',
            body: 'You have successfully updated your delegations.' })
        } catch (err) {
          this.$store.commit('notifyError', { title: 'Error While Bonding Atoms',
            body: err.message })
        }
      }
    },
    resetAlloc () {
      this.fields.delegates = this.shoppingCart.map(c => JSON.parse(JSON.stringify(c)))
    },
    leaveIfEmpty (count) {
      if (count === 0) {
        this.$store.commit('notifyError', {
          title: 'No Delegates Selected',
          body: 'Choose one or more delegates before proceeding to bond atoms.'
        })
        this.$router.push('/staking')
      }
    },
    rm (delegateId) {
      let confirm = window.confirm('Are you sure you want to remove this delegate?')
      if (confirm) {
        this.$store.commit('removeFromCart', delegateId)
        this.resetAlloc()
      }
    },
    shortenLabel (label, maxLength) {
      if (label.length <= maxLength) {
        return label
      }
      return label.substr(0, maxLength - 3) + '...'
    }
  },
  mounted () {
    this.resetAlloc()
    this.leaveIfEmpty(this.shoppingCart.length)
  },
  watch: {
    shoppingCart (newVal) {
      this.leaveIfEmpty(newVal.length)
      this.resetAlloc()
      if (this.equalize) { this.equalAlloc }
    }
  },
  validations: () => ({
    fields: {
      delegates: {
        $each: {
          atoms: {
            required,
            numeric,
            between (atoms) {
              return between(this.atomsMin, this.user.atoms)(atoms)
            }
          }
        }
      }
    }
  })
}
</script>

<style lang="stylus">
@require '~variables'

.alloc-action-container
  padding 1rem
  display flex
  justify-content flex-end

  .ni-btn-container
    margin-left 0.5rem

.submit-container
  padding 1rem
  display flex
  justify-content flex-end

.previously-bonded
  font-size sm
  padding-left 1rem

.form-msg
  color dim
  font-size xs
  line-height xs
  position relative
  top -0.25rem

.reserved-atoms
  height 4rem
  padding 2rem
  list-style-type circle

  span
    display block

  &__number
    display inline
    color bright
    font-weight 500

  &__restart
    cursor pointer

  &--error
    color danger

  &--warning
    color warning
</style>
