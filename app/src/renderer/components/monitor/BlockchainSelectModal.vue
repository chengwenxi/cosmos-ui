<template lang='pug'>
.modal-blockchain(v-if='config.modals.blockchain.active' @click='close($event)')
  .modal-blockchain-container: blockchain-select
</template>

<script>
import BlockchainSelect from 'monitor/BlockchainSelect'
import { mapGetters } from 'vuex'
export default {
  name: 'blockchain-select-modal',
  components: {
    BlockchainSelect
  },
  computed: {
    ...mapGetters(['config', 'blockchain'])
  },
  methods: {
    close (event) {
      if (!event.target.classList.contains('ni-field-select')) {
        this.$store.commit('setModalBlockchain', false)
        // console.log('closing it bc', event.target)
      } else {
        // console.log('clicked on select, not doing anything')
      }
    }
  },
  watch: {
    'blockchain.blockchainName' (val, oldVal) {
      // console.log('blockchain name changed, closing modal')
      this.$store.commit('setModalBlockchain', false)
    }
  }
}
</script>

<style lang="stylus">
@require '~variables'

.modal-blockchain
  width 100vw
  height 100vh
  background transparent
  position absolute
  top 0
  left 0
  z-index z(modal)

.modal-blockchain-container 
  border-top px solid bc
  padding 1rem - px 1rem 1rem
  background app-bg-alpha
  position fixed
  bottom 3rem
  right 0
  width 100vw
  max-width 20rem
</style>
